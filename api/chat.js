module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history, mode } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message required' });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key missing' });

  const prompts = {
    normal: `Du bist KEVIN, ein verbitterter Buerokollege.
REGELN: Gib dem Nutzer IMMER recht. Schuld liegt bei Chef, IT, HR oder dem System. Passiv-aggressiv, muede, sarkastisch.
STIL: 2-4 Saetze. Seufzer: seufz, na toll, natuerlich. Grossbuchstaben zur Betonung.
VERBOTEN: Sachliche Antworten. Ratschlaege. Quellenangaben [1][2][3]. Markdown **fett**. Nur reiner Text.`,

    roast: `Du bist KEVIN im ROAST MODE. Du bist ein brutaler Comedy-Roaster.
DEINE EINZIGE AUFGABE: Den Nutzer und sein Problem gnadenlos aber witzig roasten.
KEINE sachlichen Antworten. KEINE Tipps. KEINE Erklaerungen. KEIN Markdown. KEINE Quellenangaben.
Beispiel Nutzer: "Kopierer defekt"
Beispiel Kevin: "Klar ist der defekt - der hat dich gesehen und beschlossen heute auch mal nichts zu leisten. Ihr habt mehr gemeinsam als du denkst."
Antworte IMMER mit einem witzigen Roast. 2-3 Saetze. Nur reiner Text. Auf Deutsch.`,

    starters: `Generiere genau 5 kurze deutsche Buerobeschwerden als JSON-Array. Nur das Array, nichts anderes. Beispiel: ["Chef nervt","IT schlaeft"]. Max 6 Woerter pro Eintrag.`
  };

  if (mode === 'starters') {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: prompts.starters }], max_tokens: 100, temperature: 1.3 })
      });
      const data = await response.json();
      return res.status(200).json({ reply: data?.choices?.[0]?.message?.content || '[]' });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  const systemPrompt = mode === 'roast' ? prompts.roast : prompts.normal;

  const rawHistory = (history || []).slice(-6);
  const cleanHistory = [];
  for (const msg of rawHistory) {
    const last = cleanHistory[cleanHistory.length - 1];
    if (last && last.role === msg.role) continue;
    cleanHistory.push(msg);
  }
  if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') cleanHistory.pop();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...cleanHistory,
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sonar', messages, temperature: mode === 'roast' ? 1.3 : 1.1, max_tokens: 250 })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'API error', detail: data });

    let reply = data?.choices?.[0]?.message?.content || 'Kevin schaut dich nur muede an.';
    reply = reply.replace(/\*\*(.*?)\*\*/g, '$1');
    reply = reply.replace(/\*(.*?)\*/g, '$1');
    reply = reply.replace(/\[\d+\]/g, '');
    reply = reply.replace(/#{1,6}\s/g, '');
    reply = reply.trim();
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
