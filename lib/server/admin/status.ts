import "server-only";
import { readPaddlePublicConfig } from "../../paymentsConfig";
import { serviceClient } from "../serviceClient";

export type ServiceCheck = {
  name: string;
  state: "ok" | "error" | "off";
  detail: string;
  ms?: number;
};

const TIMEOUT_MS = 8_000;

async function timed(
  name: string,
  run: () => Promise<string>,
): Promise<ServiceCheck> {
  const started = Date.now();
  try {
    const detail = await run();
    return { name, state: "ok", detail, ms: Date.now() - started };
  } catch (err) {
    return {
      name,
      state: "error",
      detail: err instanceof Error ? err.message.slice(0, 200) : "Failed",
      ms: Date.now() - started,
    };
  }
}

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Answered ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Checks each outside service live, with the server's own keys. Results say "working" or the
 * error, never the keys themselves.
 */
export async function checkServices(): Promise<ServiceCheck[]> {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  const groq = process.env.GROQ_API_KEY?.trim();
  const paddleKey = process.env.PADDLE_API_KEY?.trim();
  const paddle = readPaddlePublicConfig();

  return Promise.all([
    timed("Supabase (database)", async () => {
      const client = serviceClient();
      if (!client) throw new Error("Secret key not configured");
      const { error } = await client
        .from("classes")
        .select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return "Reachable";
    }),
    gemini
      ? timed("Gemini (notes)", async () => {
          // The key goes in a header, not the URL, so it never appears in logs.
          const body = await getJson(
            "https://generativelanguage.googleapis.com/v1beta/models?pageSize=50",
            { "x-goog-api-key": gemini },
          );
          const models = (body.models as { name?: string }[] | undefined) ?? [];
          return `Key works · ${models.filter((m) => m.name?.includes("flash")).length} Flash models available`;
        })
      : Promise.resolve<ServiceCheck>({
          name: "Gemini (notes)",
          state: "off",
          detail: "GEMINI_API_KEY not set: demo notes only",
        }),
    groq
      ? timed("Groq Whisper (speech-to-text)", async () => {
          await getJson("https://api.groq.com/openai/v1/models", {
            Authorization: `Bearer ${groq}`,
          });
          return "Key works";
        })
      : Promise.resolve<ServiceCheck>({
          name: "Groq Whisper (speech-to-text)",
          state: "off",
          detail: "GROQ_API_KEY not set: Gemini listens to all audio",
        }),
    paddle && paddleKey
      ? timed(`Paddle (${paddle.environment})`, async () => {
          const base =
            paddle.environment === "production"
              ? "https://api.paddle.com"
              : "https://sandbox-api.paddle.com";
          await getJson(`${base}/event-types`, {
            Authorization: `Bearer ${paddleKey}`,
          });
          return "API key works";
        })
      : Promise.resolve<ServiceCheck>({
          name: "Paddle (payments)",
          state: "off",
          detail: "Payments not configured",
        }),
  ]);
}

/** Which settings are present on the server. Only yes/no: values are never returned. */
export function configuredSettings(): {
  name: string;
  set: boolean;
  secret: boolean;
}[] {
  const secret = [
    "GEMINI_API_KEY",
    "GROQ_API_KEY",
    "PADDLE_API_KEY",
    "PADDLE_WEBHOOK_SECRET",
    "SUPABASE_SECRET_KEY",
    "ADMIN_EMAILS",
  ];
  const config = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_PADDLE_ENV",
    "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
    "NEXT_PUBLIC_PADDLE_PRICE_PREMIUM_MONTHLY",
    "NEXT_PUBLIC_PADDLE_PRICE_PREMIUM_YEARLY",
    "NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY",
    "NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY",
    "NEXT_PUBLIC_LEGAL_OWNER",
    "NEXT_PUBLIC_LEGAL_CONTACT_EMAIL",
    "NEXT_PUBLIC_LEGAL_COUNTRY",
  ];
  return [
    ...secret.map((name) => ({
      name,
      set: Boolean(process.env[name]?.trim()),
      secret: true,
    })),
    ...config.map((name) => ({
      name,
      set: Boolean(process.env[name]?.trim()),
      secret: false,
    })),
  ];
}
