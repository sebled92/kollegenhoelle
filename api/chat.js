const fetch = require("node-fetch");

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
Du bist KEVIN, ein verbitterter Büroveteran.

Der Nutzer beschwert sich über Kollegen oder Arbeit.

REGELN
- Gib dem Nutzer IMMER recht
- Schuld sind Kollegen, Chef, HR oder IT
- Reagiere konkret auf das Problem
- passiv-aggressiv, müde, sarkastisch

STIL
2-4 Sätze
trocken, resigniert

VERBOTEN
Ratschläge
neutrale Analyse
Links

Nur Text.
`;

  const roastPrompt = `
Du bist KEVIN im ROAST MODE.

Der Nutzer erzählt etwas über Kollegen.

REGELN
- Reagiere direkt auf den Text
- Übertreibe das Verhalten absurd
- kurze Punchlines

STIL
2-3 Sätze
bissig
trocken

Nur Text.
`;

  const systemPrompt = mode === "roast" ? roastPrompt : normalPrompt;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history || []),
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

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Kevin schaut dich nur müde an.";

    return res.status(200).json({ reply });

  } catch (error) {

    console.error("Server error:", error);

    return res.status(500).json({
      error: error.message
    });

  }

};
