export type AuthRedirect = { code?: string; error?: string };

/**
 * Reads the result of a sign-in from the link it returns to, such as
 * "focusnotes://?code=abc" or "exp://192.168.1.5:8081#error=access_denied".
 * Values can be in the query string or after the "#", depending on the provider.
 */
export function parseAuthRedirect(url: string): AuthRedirect {
  const params = new Map<string, string>();
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const query = queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex > queryIndex ? hashIndex : undefined) : "";
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";

  for (const part of [query, fragment]) {
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }

  const error = params.get("error_description") || params.get("error") || undefined;
  return { code: params.get("code") || undefined, error };
}

/**
 * The return address for an app running in Expo Go, which only opens exp:// links that point at
 * the development server it loaded the app from. hostUri looks like "192.168.1.20:8081".
 */
export function expoGoReturnAddress(hostUri: string | undefined): string | undefined {
  const host = hostUri?.trim().replace(/^[a-z]+:\/\//i, "").split("/")[0];
  return host ? `exp://${host}` : undefined;
}
