const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT = `Suggest one short, fun "side quest" for someone who is bored —
a small, doable real-world activity (not a chore, not generic advice).
Keep the quest text under 15 words.
Pick a category: creative, physical, social, or weird.

Respond with ONLY raw JSON, no markdown formatting, no code fences, in
exactly this shape:
{"text": "...", "category": "..."}`;

export async function generateQuestIdea() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set on the server');
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 300,
        // Gemini's newer models "think" before answering by default, which
        // can consume the entire token budget on invisible reasoning and
        // leave the actual output empty. This task is simple enough not to
        // need that, so it's turned off.
        thinkingConfig: { thinkingBudget: 0 },
        // Ask the API itself to guarantee valid JSON in this exact shape,
        // rather than hoping the model obeys the prompt. Prompt-only JSON
        // occasionally comes back wrapped in extra words or cut off.
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING' },
            category: { type: 'STRING' },
          },
          required: ['text', 'category'],
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${body}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    // Log the full response so a future empty-output failure is diagnosable
    // (e.g. finishReason: 'MAX_TOKENS' or a safety block) instead of a
    // guessing game.
    console.error('Gemini returned no text. Full response:', JSON.stringify(data, null, 2));
    throw new Error('Gemini API returned an empty response');
  }

  // Belt and braces: even with a forced JSON response, strip code fences and
  // pull out just the {...} object in case anything extra surrounds it.
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);

  let parsed;
  try {
    parsed = JSON.parse(match ? match[0] : cleaned);
  } catch {
    // Log exactly what came back so a failure is diagnosable, not a mystery.
    console.error('Gemini returned unparseable JSON. Raw text was:', raw);
    throw new Error('Gemini API returned unparseable JSON');
  }

  if (!parsed.text) {
    throw new Error('Gemini API response was missing quest text');
  }

  return {
    text: String(parsed.text).slice(0, 200),
    category: parsed.category || null,
  };
}