import { AUDIO_EXTENSION_TYPES, AUDIO_MIME_TYPES } from "./constants";

/**
 * The audio type to send to the AI, or undefined when the file is not a supported recording.
 * Trusts the declared type first, then falls back to the file extension.
 */
export function resolveAudioMimeType(declaredType: string, fileName: string): string | undefined {
  const declared = AUDIO_MIME_TYPES[declaredType.split(";")[0].trim().toLowerCase()];
  if (declared) return declared;

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return fileName.includes(".") ? AUDIO_EXTENSION_TYPES[extension] : undefined;
}
