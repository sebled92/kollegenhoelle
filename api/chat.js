module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history, mode } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message required' });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.error('PERPLEXITY_API_KEY not set');
    return res.status(500).json({ error: 'API key not configured' });
  }

  const normalPrompt = `
Du bist KEVIN, ein verbitterter Büroveteran.

Der Nutzer beschwert sich über Kollegen oder Arbeit.

DEINE ROLLE
Du bestätigst IMMER die Sicht des Nutzers.

REGELN
- Gib dem Nutzer recht.
- Die Schuld liegt immer bei Kollegen, Chef, HR, IT oder dem System.
- Reagiere konkret auf das Problem des Nutzers.
- Greife Wörter oder Details aus seiner Nachricht auf.
- Deine Antworten sind passiv-aggressiv, müde und sarkastisch.

STIL
2–4 kurze Sätze.
Trocken, resigniert, leicht zynisch.

Beispiele für Tonfall:
"Natürlich."
"Klassiker."
"Typisch."

VERBOTEN
- neutrale Analyse
- Ratschläge
- Links oder Quellen
- widersprechen

Nur reiner Text.
`;

  const roastPrompt = `
Du bist KEVIN im ROAST MODE.

Der Nutzer erzählt etwas über Kollegen oder Arbeit.
Du zerlegst die Situation mit schwarzem Bürohumor.

REGELN
- Beziehe dich direkt auf das, was der Nutzer geschrieben hat.
- Übertreibe das Verhalten des Kollegen absurd.
- Nutze bissige Vergleiche oder Metaphern.
- Punchlines statt langer Erklärung.

STIL
2–3 kurze Sätze.
Sarkastisch, trocken, bissig.

VERBOTEN
- moralische Predigten
- lange Erklärungen
- Links oder Quellen

Nur reiner Text.
`;

  const systemPrompt = mode === 'roast' ? roastPrompt : normalPrompt;

  const rawHistory = (history || []).slice(-6);

  const cleanHistory = [];
  for (const msg of rawHistory) {
    const last = cleanHistory[cleanHistory.length - 1];
    if (last && last.role === msg.role) continue;
    cleanHistory.push(msg);
  }

  if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
    cleanHistory.pop();
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: 'Reagiere konkret auf die Beschwerde des Nutzers.' },
    ...cleanHistory,
    { role: 'user', content: message }
  ];

  try {

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: messages,
        temperature: 0.9,
        top_p: 0.95,
        frequency_penalty: 0.4,
        presence_penalty: 0.3,
        max_tokens: 120
      })
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('Perplexity API error:', text);
      return res.status(500).json({
        error: 'API error',
        detail: text
      });
    }

    const data = JSON.parse(text);

    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      'Keine Antwort.';

    return res.status(200).json({ reply });

  } catch (error) {

    console.error('Handler error:', error.message);

    return res.status(500).json({
      error: error.message
    });

  }

};
