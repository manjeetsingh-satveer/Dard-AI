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
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const raw = await anthropicResponse.text();
    if (!anthropicResponse.ok) {
      return res.status(anthropicResponse.status).json({ error: raw });
    }
    const data = JSON.parse(raw);

    if (data.stop_reason === 'max_tokens') {
      return res.status(500).json({
        error: 'AI response was cut off because it exceeded the token limit. Try shortening your input, or increase max_tokens in api/analyze.js.'
      });
    }

    let text = data.content?.[0]?.text?.trim();
    if (!text) {
      return res.status(500).json({ error: 'No response text from Anthropic' });
    }

    // Strip markdown code fences if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    // Trim stray text before/after the actual JSON object
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let start = -1;
    if (firstBrace === -1) start = firstBracket;
    else if (firstBracket === -1) start = firstBrace;
    else start = Math.min(firstBrace, firstBracket);
    if (start > 0) text = text.slice(start);

    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    if (end !== -1 && end < text.length - 1) text = text.slice(0, end + 1);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      // Repair pass 1: fix unescaped double quotes that appear INSIDE string values
      // (the most common failure: Claude quoting a patient's exact words like "really bad")
      // Strategy: walk the text and re-escape any " that is not acting as a structural
      // JSON delimiter (i.e. not preceded by : { , [ and not followed by : , } ] or whitespace+those).
      try {
        const repaired = repairUnescapedQuotes(text);
        parsed = JSON.parse(repaired);
      } catch (repairErr) {
        // Repair pass 2: strip stray control characters and escape lone backslashes, then retry
        try {
          const repaired2 = text
            .replace(/[\u0000-\u0009\u000B-\u001F]/g, ' ')
            .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
          parsed = JSON.parse(repaired2);
        } catch (repairErr2) {
          return res.status(500).json({
            error: `Failed to parse AI response as JSON: ${parseErr.message}`,
            rawSnippet: text.slice(0, 800)
          });
        }
      }
    }

    return res.status(200).json({ result: parsed });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}

// Re-escapes stray double quotes that sit inside string values without breaking
// legitimate structural quotes (the ones that open/close keys and values).
function repairUnescapedQuotes(input) {
  let out = '';
  let inString = false;
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      i++;
      continue;
    }

    // We are inside a string value/key
    if (ch === '\\') {
      // Already-escaped sequence, copy both characters as-is
      out += ch;
      if (i + 1 < n) {
        out += input[i + 1];
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (ch === '"') {
      // Decide whether this quote legitimately CLOSES the string,
      // by looking ahead past whitespace for a structural character.
      let j = i + 1;
      while (j < n && /\s/.test(input[j])) j++;
      const next = input[j];
      const closesString = (
        next === undefined ||
        next === ',' || next === '}' || next === ']' || next === ':'
      );

      if (closesString) {
        out += ch;
        inString = false;
        i++;
        continue;
      } else {
        // This is a stray quote inside the string content (e.g. quoting patient's words) — escape it
        out += '\\"';
        i++;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}
