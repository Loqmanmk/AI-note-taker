import { createHash, getRandomValues } from "node:crypto";
import { describe, expect, it } from "vitest";
import { installWebCryptoShim, type WebCryptoImpl } from "../lib/webCryptoShim";

/** Stands in for expo-crypto, using Node's own crypto. */
const nodeImpl: WebCryptoImpl = {
  algorithms: ["SHA-1", "SHA-256", "SHA-384", "SHA-512"],
  digest: async (algorithm, data) => {
    const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
    const out = createHash(algorithm.replace("-", "").toLowerCase()).update(bytes).digest();
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  },
  getRandomValues: (array) => getRandomValues(array),
};

type Shimmed = { crypto?: { getRandomValues?: unknown; subtle?: unknown } };

describe("installWebCryptoShim", () => {
  it("produces the standard PKCE S256 challenge, as Supabase computes it", async () => {
    const target: Shimmed = {};
    installWebCryptoShim(target, nodeImpl);
    const subtle = target.crypto!.subtle as SubtleCrypto;

    // Example verifier and challenge from RFC 7636, appendix B.
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const hash = new Uint8Array(await subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const challenge = btoa(String.fromCharCode(...hash)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("fills in secure random values", () => {
    const target: Shimmed = {};
    installWebCryptoShim(target, nodeImpl);
    const values = (target.crypto!.getRandomValues as (a: Uint32Array) => Uint32Array)(new Uint32Array(8));
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it("leaves existing functions alone", () => {
    const existing = { getRandomValues: () => "mine", subtle: { digest: () => "mine" } };
    const target: Shimmed = { crypto: existing };
    installWebCryptoShim(target, nodeImpl);
    expect(target.crypto).toBe(existing);
    expect(existing.getRandomValues()).toBe("mine");
  });

  it("refuses hash names it cannot compute", async () => {
    const target: Shimmed = {};
    installWebCryptoShim(target, { ...nodeImpl, algorithms: ["SHA-256"] });
    await expect((target.crypto!.subtle as SubtleCrypto).digest("SHA-512", new Uint8Array())).rejects.toThrow();
  });
});
