/** The native functions used to fill in Web Crypto, for example from expo-crypto. */
export type WebCryptoImpl = {
  digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
  /** Hash names the implementation supports, such as "SHA-256". */
  algorithms: readonly string[];
};

type CryptoLike = { getRandomValues?: unknown; subtle?: unknown };

/**
 * Adds crypto.getRandomValues and crypto.subtle.digest where they are missing.
 * Supabase's sign-in (PKCE) needs them: without crypto.subtle it falls back to the weaker
 * "plain" method, and without crypto at all it makes its secret with Math.random.
 * Anything that already exists is left untouched.
 */
export function installWebCryptoShim(target: { crypto?: CryptoLike }, impl: WebCryptoImpl): void {
  if (!target.crypto) target.crypto = {};
  const crypto = target.crypto;

  if (typeof crypto.getRandomValues !== "function") {
    crypto.getRandomValues = <T extends ArrayBufferView>(array: T) => impl.getRandomValues(array);
  }

  if (!crypto.subtle) {
    crypto.subtle = {
      digest(algorithm: string | { name: string }, data: BufferSource): Promise<ArrayBuffer> {
        const name = (typeof algorithm === "string" ? algorithm : algorithm.name).toUpperCase();
        if (!impl.algorithms.includes(name)) {
          return Promise.reject(new Error(`crypto.subtle.digest does not support ${name} here`));
        }
        return impl.digest(name, data);
      },
    };
  }
}
