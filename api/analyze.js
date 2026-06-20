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
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const raw = await anthropicResponse.text();
    if (!anthropicResponse.ok) {
      return res.status(anthropicResponse.status).json({ error: raw });
    }
    const data = JSON.parse(raw);
    let text = data.content?.[0]?.text?.trim();
    if (!text) {
      return res.status(500).json({ error: 'No response text from Anthropic' });
    }

    // Strip markdown code fences if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    // Extract just the JSON object/array in case there's any stray text before/after
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let start = -1;
    if (firstBrace === -1) start = firstBracket;
    else if (firstBracket === -1) start = firstBrace;
    else start = Math.min(firstBrace, firstBracket);

    if (start > 0) {
      text = text.slice(start);
    }

    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    if (end !== -1 && end < text.length - 1) {
      text = text.slice(0, end + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      // Attempt a repair pass: strip stray control chars and escape lone backslashes, then retry once
      try {
        const repaired = text
          .replace(/[\u0000-\u0009\u000B-\u001F]/g, ' ')
          .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
        parsed = JSON.parse(repaired);
      } catch (repairErr) {
        return res.status(500).json({
          error: `Failed to parse AI response as JSON: ${parseErr.message}`,
          rawSnippet: text.slice(0, 500)
        });
      }
    }

    return res.status(200).json({ result: parsed });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
