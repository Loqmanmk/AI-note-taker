import { NotesResponseSchema, type NotesRequest, type NotesResponse } from "../schema";

const GENERIC_ERROR = "Something went wrong. Check your connection and try again.";

/** The server refused the request because the student is not signed in, or their session ended. */
export class SignInRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignInRequiredError";
  }
}

/** Asks the server for a study pack. Throws an Error with a message safe to show the student. */
export async function requestStudyPack(
  request: NotesRequest,
  accessToken?: string,
  signal?: AbortSignal,
): Promise<NotesResponse> {
  let res: Response;
  try {
    res = await fetch("/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new Error(GENERIC_ERROR);
  }

  const data: unknown = await res.json().catch(() => null);
  const message = (data as { error?: unknown } | null)?.error;
  const safeMessage = typeof message === "string" ? message : GENERIC_ERROR;

  if (res.status === 401) throw new SignInRequiredError(safeMessage);
  if (!res.ok) throw new Error(safeMessage);

  const parsed = NotesResponseSchema.safeParse(data);
  if (!parsed.success) throw new Error(GENERIC_ERROR);
  return parsed.data;
}
