const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Call the Anthropic Claude API.
 * Returns the parsed JSON from Claude's first content block.
 * Throws on non-OK response or JSON parse failure (with fallback regex extract).
 */
export async function callClaude({ system, messages, maxTokens = 1024, model = DEFAULT_MODEL }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const raw = data.content[0].text.trim();

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Claude returned non-JSON: ' + raw.slice(0, 200));
    return JSON.parse(match[0]);
  }
}

export const LOCALE_TO_LANGUAGE = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German',
};
