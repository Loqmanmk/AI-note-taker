// Diagnoses the Gemini connection step by step. Run with: npm run check:ai
// It never prints your API key.
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
const models = (process.env.GEMINI_MODEL || "gemini-3.8-flash,gemini-3.5-flash,gemini-2.5-flash")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const STEP_TIMEOUT_MS = 30_000;

if (!key) {
  console.log("FAIL: GEMINI_API_KEY is not set in .env.local");
  process.exit(1);
}
console.log(`Key found (${key.length} characters). Models, in order: ${models.join(", ")}\n`);

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
  const missing = models.filter((m) => !names.includes(m));
  return missing.length ? `NOT IN THE LIST: ${missing.join(", ")}` : "All configured models exist.";
});
if (!reachable) process.exit(1);

const jsonConfig = {
  responseMimeType: "application/json",
  responseJsonSchema: {
    type: "object",
    properties: { title: { type: "string" }, points: { type: "array", items: { type: "string" } } },
    required: ["title", "points"],
  },
};

let working = 0;
for (const model of models) {
  const ok = await step(`2. Small JSON answer from ${model}`, async (abortSignal) => {
    const res = await ai.models.generateContent({
      model,
      contents: "Summarise photosynthesis as JSON with a title and three bullet points.",
      config: { abortSignal, ...jsonConfig },
    });
    return `Start of answer: ${String(res.text).slice(0, 100).replace(/\s+/g, " ")}`;
  });
  if (ok) working++;
}

console.log(
  working
    ? `\n${working} of ${models.length} models answered. The app tries them in order, so it should work.`
    : "\nNo model answered. Google's free service is busy right now; try again in a few minutes.",
);
