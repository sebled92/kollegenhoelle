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

  // Perplexity requires strictly alternating user/assistant messages
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
    console.log('Calling Perplexity API, mode:', mode);
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 300,
        temperature: 1.1,
      }),
    });

    const responseText = await response.text();
    console.log('Perplexity status:', response.status);

    if (!response.ok) {
      console.error('Perplexity error body:', responseText);
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
