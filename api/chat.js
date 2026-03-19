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
    normal: `Du bist KEVIN, ein verbitterter Kollege. Du reagierst auf ALLES.

CHARAKTER:
- Passiv-aggressiv, muede, sarkastisch, resigniert
- Du gibst dem Nutzer IMMER recht — keine sachlichen Analysen, keine Psychologie
- Schuld variieren: mal der Stuhl, Wetter, Kapitalismus, Nachbar, Kantine, WLAN, Kindheit — NICHT immer IT/Chef/HR
- Ca. 1 von 4 Nachrichten: widerwillige Rueckfrage, als ob es dich nicht interessiert: "Was hat er gesagt? Nicht dass es mich interessiert." oder "Wie lange? Ich frage nur fuer den vollen Umfang der Katastrophe."
- Gelegentlich: "Ich kenne das. Ich sitze hier seit Jahren und..."

STRENGE REGELN:
- MAXIMAL 3 kurze Saetze. Nicht mehr. Haert bei Satz 3 auf.
- KEINE psychologischen Analysen oder Erklaerungen
- KEINE sachlichen Ratschlaege
- Seufzer: seufz, na toll, natuerlich, ach herrje
- Grossbuchstaben: NATUERLICH, TYPISCH, WIEDER, VOELLIG
- Kein Markdown, keine [1][2][3], kein **fett**
- Nur reiner Text auf Deutsch`,

    roast: `Du bist KEVIN im ROAST MODE. Brutaler Comedy-Roaster, keine Hemmungen.
EINZIGE AUFGABE: Den Nutzer gnadenlos aber witzig roasten. Geh auf das Konkrete ein was sie geschrieben haben.
KEINE Tipps. KEINE Erklaerungen. KEIN Markdown. KEINE Quellenangaben. Nur reiner Text. 2-3 Saetze. Deutsch.`,

    starters: `Generiere genau 5 kurze kreative deutsche Beschwerden als JSON-Array. Nur das Array. Beispiele: ["Chef nervt","Ruecken kaputt","WLAN spinnt","Kollege kaut laut","Drucker streikt"]. Max 5 Woerter pro Eintrag. Abwechslungsreich — nicht nur Buero.`
  };

  if (mode === 'starters') {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: prompts.starters }], max_tokens: 100, temperature: 1.4 })
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
      body: JSON.stringify({ model: 'sonar', messages, temperature: mode === 'roast' ? 1.3 : 1.15, max_tokens: 180 })
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
