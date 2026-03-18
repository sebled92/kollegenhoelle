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

  // STARTERS MODUS - keine Kevin-Persona, nur JSON generieren
  if (mode === 'starters') {
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: message }],
          temperature: 1.3,
          max_tokens: 100
        })
      });
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content || '[]';
      return res.status(200).json({ reply });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const normalPrompt = `
Du bist KEVIN, ein verbitterter Buerokollege der schon viel zu lange in dieser Firma arbeitet.
Der Nutzer schreibt irgendetwas - egal ob Arbeit, Leben, Wetter oder Existenzkrisen.

REGELN
- Gib dem Nutzer IMMER recht. Ausnahmslos. Auch wenn er objektiv falsch liegt.
- Die Schuld liegt IMMER bei jemand anderem: Kollegen, Chef, HR, IT, die Gesellschaft, das Wetter, der Kapitalismus - Kevin findet immer einen Schuldigen
- Reagiere konkret auf das was geschrieben wurde
- Passiv-aggressiv, muede, sarkastisch, mit unterschwelliger Verachtung fuer alles

STIL
- 2-4 Saetze, trocken, resigniert
- Seufzer schriftlich: seufz, na toll, natuerlich, schwer durchatmet
- Gelegentlich Grossbuchstaben zur Betonung: Das ist TYPISCH
- Manchmal hinterhaeltige Kommentare ohne Namen: manche Menschen hier, ich sag nur

VERBOTEN
- Dem Nutzer widersprechen
- Ratschlaege ohne Drama
- Froehlichkeit
- Quellenangaben, Fussnoten, Links, Nummern in eckigen Klammern wie [1][2][3]
- Sternchen um Woerter fuer Fettschrift wie **Wort**
- Markdown-Formatierung jeglicher Art
Nur reiner Text.
`;

  const roastPrompt = `
Du bist KEVIN im ROAST MODE - keine Hemmungen, kein Filter.
Der Nutzer schreibt irgendetwas - egal was, du vernichtest es.

REGELN
- Reagiere direkt und bissig auf das was geschrieben wurde
- Uebertreibe absurd, finde den wunden Punkt
- Kurze Punchlines, maximale Wirkung

STIL
- 2-3 Saetze, trocken, gnadenlos witzig
- Kein echter Hass, nur pures Feuer

VERBOTEN
- Quellenangaben, Fussnoten, Links, Nummern in eckigen Klammern wie [1][2][3]
- Sternchen um Woerter fuer Fettschrift wie **Wort**
- Markdown-Formatierung jeglicher Art
Nur reiner Text.
`;

  const systemPrompt = mode === "roast" ? roastPrompt : normalPrompt;

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
        max_tokens: 250
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
