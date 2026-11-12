// Diagnoses the Gemini connection step by step. Run with: npm run check:ai
// It never prints your API key.
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const STEP_TIMEOUT_MS = 60_000;

if (!key) {
  console.log("FAIL: GEMINI_API_KEY is not set in .env.local");
  process.exit(1);
}
console.log(`Key found (${key.length} characters). Model: ${model}\n`);

const ai = new GoogleGenAI({ apiKey: key });
const seconds = (start) => `${((Date.now() - start) / 1000).toFixed(1)}s`;

async function step(name, run) {
  const start = Date.now();
  process.stdout.write(`${name} ... `);
  try {
    const detail = await run(AbortSignal.timeout(STEP_TIMEOUT_MS));
    console.log(`OK in ${seconds(start)}${detail ? `\n   ${detail}` : ""}`);
    return true;
  } catch (err) {
    const status = err?.status ? ` (HTTP ${err.status})` : "";
    const cause = err?.cause?.code || err?.cause?.message || "";
    console.log(`FAIL after ${seconds(start)}${status}\n   ${err?.name}: ${String(err?.message).slice(0, 400)} ${cause}`);
    return false;
  }
}

const reachable = await step("1. Reach Google and list models", async (abortSignal) => {
  const names = [];
  const pager = await ai.models.list({ config: { abortSignal, pageSize: 100 } });
  for await (const m of pager) names.push(m.name.replace("models/", ""));
  const flash = names.filter((n) => n.includes("flash"));
  const found = names.includes(model) ? "is available" : "IS NOT IN THE LIST";
  return `"${model}" ${found}. Flash models: ${flash.join(", ") || "none"}`;
});
if (!reachable) process.exit(1);

await step("2. Tiny question", async (abortSignal) => {
  const res = await ai.models.generateContent({ model, contents: "Reply with the word: ready", config: { abortSignal } });
  return `Answer: ${String(res.text).trim().slice(0, 60)}`;
});

await step("3. Small JSON answer (streamed)", async (abortSignal) => {
  const start = Date.now();
  let first = "";
  let text = "";
  let finish = "";
  const stream = await ai.models.generateContentStream({
    model,
    contents: "Summarise photosynthesis as JSON with a title and three bullet points.",
    config: {
      abortSignal,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { title: { type: "string" }, points: { type: "array", items: { type: "string" } } },
        required: ["title", "points"],
      },
    },
  });
  for await (const chunk of stream) {
    if (!first && chunk.text) first = seconds(start);
    text += chunk.text ?? "";
    finish = chunk.candidates?.[0]?.finishReason ?? finish;
  }
  return `First text after ${first || "never"}, ${text.length} characters, finish: ${finish}\n   Start of answer: ${text.slice(0, 120).replace(/\s+/g, " ")}`;
});
