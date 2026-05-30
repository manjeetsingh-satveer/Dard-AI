export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY in Vercel Environment Variables' });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const raw = await anthropicResponse.text();
    if (!anthropicResponse.ok) {
      return res.status(anthropicResponse.status).json({ error: raw });
    }

    const data = JSON.parse(raw);
    const text = data.content?.[0]?.text?.replace(/```json|```/g, '').trim();
    if (!text) {
      return res.status(500).json({ error: 'No response text from Anthropic' });
    }

    return res.status(200).json({ result: JSON.parse(text) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
