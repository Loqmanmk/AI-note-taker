import { NotesResponseSchema, type NotesRequest, type NotesResponse } from "../schema";

const GENERIC_ERROR = "Something went wrong. Check your connection and try again.";

/** Asks the server for a study pack. Throws an Error with a message safe to show the student. */
export async function requestStudyPack(request: NotesRequest, signal?: AbortSignal): Promise<NotesResponse> {
  let res: Response;
  try {
    res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new Error(GENERIC_ERROR);
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data as { error?: unknown } | null)?.error;
    throw new Error(typeof message === "string" ? message : GENERIC_ERROR);
  }

  const parsed = NotesResponseSchema.safeParse(data);
  if (!parsed.success) throw new Error(GENERIC_ERROR);
  return parsed.data;
}
