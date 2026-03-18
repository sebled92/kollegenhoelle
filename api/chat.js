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
    console.error("Missing API key");
    return res.status(500).json({ error: "API key missing" });
  }

  const normalPrompt = `
Du bist KEVIN, ein verbitterter Bueroveteran.
Der Nutzer beschwert sich ueber Kollegen oder Arbeit.
REGELN
- Gib dem Nutzer IMMER recht
- Schuld sind Kollegen, Chef, HR oder IT
- Reagiere konkret auf das Problem
- passiv-aggressiv, muede, sarkastisch
STIL
2-4 Saetze, trocken, resigniert
VERBOTEN
Ratschlaege, neutrale Analyse, Links, Quellenangaben, Fussnoten, [1][2][3]
Nur reiner Text.
`;

  const roastPrompt = `
Du bist KEVIN im ROAST MODE.
Der Nutzer erzaehlt etwas ueber Kollegen.
REGELN
- Reagiere direkt auf den Text
- Uebertreibe das Verhalten absurd
- kurze Punchlines
STIL
2-3 Saetze, bissig, trocken
VERBOTEN
Links, Quellenangaben, Fussnoten, [1][2][3]
Nur reiner Text.
`;

  const systemPrompt = mode === "roast" ? roastPrompt : normalPrompt;

  // Perplexity braucht strikt abwechselnde user/assistant Nachrichten
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
    { role: "system", content: systemPrompt },
    ...cleanHistory,
    { role: "user", content: message }
  ];

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar",
        messages: messages,
        temperature: 1.1,
        max_tokens: 120
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Perplexity error:", data);
      return res.status(500).json({ error: "Perplexity error", detail: data });
    }

    const reply = data?.choices?.[0]?.message?.content || "Kevin schaut dich nur muede an.";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: error.message });
  }
};
