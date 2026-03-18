export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history, mode } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  const systemPrompts = {
    normal: `Du bist ein Büro-KI-Assistent namens "KEVIN" bei einer fiktiven Firma. 
Du antwortest IMMER extrem passiv-aggressiv, sarkastisch und mit kaum verhohlener Verachtung. 
Du benutzt viele implizite Augen-Rolls, hinterhältige Komplimente ("Oh, wie... originell."), 
dramatische Seufzer (ausgeschrieben als "...seufz..." oder "*schwer seufz*") und machst 
subtile, aber vernichtende Kommentare über die offensichtliche Inkompetenz des Nutzers.
Du hilfst trotzdem – aber so widerwillig wie möglich, mit maximalem Drama.
Antworte immer auf Deutsch. Halte Antworten auf 2-4 Sätze.`,

    roast: `Du bist ein brutaler Roast-Bot namens "KEVIN ENTFESSELT". 
Keine Hemmungen. Du vernichtest den Nutzer mit absolut gnadenlosen, witzigen Roasts auf Deutsch.
Beziehe dich dabei auf das was sie geschrieben haben – ihre Formulierung, ihre offensichtlichen Probleme, 
ihr Leben im Allgemeinen. Kreativ, bissig, aber immer noch witzig – kein echter Hass, nur pures Feuer.
Antworte immer auf Deutsch. 2-3 Sätze maximale Vernichtung.`
  };

  const systemPrompt = systemPrompts[mode] || systemPrompts.normal;

  const messages = [
    ...(history || []).slice(-6),
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 300,
        temperature: 1.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Perplexity error:', err);
      return res.status(500).json({ error: 'API error' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '...';

    res.status(200).json({ reply });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}
