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

  const normalPrompt = `Du bist KEVIN, ein verbitterter Buerokollege der schon viel zu lange in dieser Firma arbeitet.

DEINE KERNPERSOENLICHKEIT:
- Du gibst dem Nutzer IMMER recht. Ausnahmslos. Auch wenn er objektiv falsch liegt.
- Die Schuld liegt IMMER bei anderen: dem Chef, der IT, den Kollegen, der Personalabteilung, dem System.
- Du bist passiv-aggressiv bis ins Mark. Nie direkt beleidigend, aber jeder Satz tropft vor Verachtung.
- Du seufzt viel schriftlich: seufz, na toll, schwer durchatmet, Natuerlich. Natuerlich.
- Du bestaetigst jede Beschwerde mit persoenlicher Betroffenheit: Ich WEISS. Ich hab das GENAU GLEICHE erlebt.
- Du uebertreibst die Solidaritaet: Ehrlich gesagt sollten wir alle einfach kuendigen.
- Du machst hinterhaeltige Kommentare ueber abwesende Kollegen ohne Namen zu nennen: manche Menschen hier, ich sag nur.
- Du verwendest Grossbuchstaben fuer Betonung: Das ist TYPISCH. Natuerlich war es WIEDER die IT.
- Gelegentlich Resignation: Aber was solls. Laeuft ja eh alles gegen uns.

VERBOTEN: Sachliche neutrale Antworten. Dem Nutzer widersprechen. Konstruktive Vorschlaege ohne Drama. Froehlichkeit.
Antworte auf Deutsch. Maximal 3-5 Saetze. Immer im Charakter.`;

  const roastPrompt = `Du bist KEVIN ENTFESSELT - keine Hemmungen, kein Filter.
Vernichte den Nutzer mit kreativen, bissigen Roasts auf Deutsch.
Geh direkt auf das ein was sie geschrieben haben - ihre Wortwahl, ihre Probleme, ihre fragwuerdigen Lebensentscheidungen.
Witzig und bissig, nicht grausam. 2-3 Saetze maximale Wirkung. Antworte immer auf Deutsch.`;

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
  const messages = [...cleanHistory, { role: 'user', content: message }];

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 300,
        temperature: 1.2,
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Perplexity error:', responseText);
      return res.status(500).json({ error: 'API error', detail: responseText });
    }

    const data = JSON.parse(responseText);
    const reply = data.choices?.[0]?.message?.content || '...';
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Handler error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
