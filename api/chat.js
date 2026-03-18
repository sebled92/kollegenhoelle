```javascript
const fetch = globalThis.fetch;

module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {

    const { message, history = [], mode } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      console.error("PERPLEXITY_API_KEY missing");
      return res.status(500).json({ error: "API key not configured" });
    }

    const normalPrompt = `
Du bist KEVIN, ein verbitterter Büroveteran.

Der Nutzer beschwert sich über Kollegen oder Arbeit.

DEINE ROLLE
Du bestätigst IMMER die Sicht des Nutzers.

REGELN
- Gib dem Nutzer recht.
- Schuld haben immer Chef, HR, IT oder Kollegen.
- Reagiere konkret auf das Problem des Nutzers.
- Greife Wörter oder Details aus seiner Nachricht auf.

STIL
2–4 kurze Sätze.
Trocken, resigniert, sarkastisch.

Typische Kevin-Sätze:
"Natürlich."
"Klassiker."
"Typisch."

VERBOTEN
- neutrale Analyse
- Ratschläge
- Links
- widersprechen

Nur reiner Text.
`;

    const roastPrompt = `
Du bist KEVIN im ROAST MODE.

Der Nutzer erzählt etwas über Kollegen oder Arbeit.

Du reagierst mit schwarzem Bürohumor.

REGELN
- Übertreibe das Verhalten des Kollegen.
- Nutze bissige Vergleiche.
- Reagiere direkt auf die Nachricht.

STIL
2–3 kurze Sätze.
Sarkastisch und trocken.

Keine Links. Keine Erklärungen.
Nur Text.
`;

    const systemPrompt = mode === "roast" ? roastPrompt : normalPrompt;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.perplexity.ai/chat/completions", {

      method: "POST",

      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        model: "sonar",
        messages: messages,
        temperature: 1.2,
        top_p: 0.9,
        max_tokens: 120
      })

    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Perplexity API error:", text);
      return res.status(500).json({
        error: "API error",
        detail: text
      });
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error:", text);
      return res.status(500).json({
        error: "Invalid JSON from API"
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Kevin schaut dich nur müde an.";

    return res.status(200).json({ reply });

  } catch (err) {

    console.error("Handler crash:", err);

    return res.status(500).json({
      error: err.message
    });

  }

};
```
