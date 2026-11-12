import * as ExpoCrypto from "expo-crypto";
import { installWebCryptoShim } from "@shared/webCryptoShim";

// React Native has no crypto.subtle, so Supabase's sign-in would use the weaker "plain" PKCE
// method. expo-crypto provides native SHA-256 and secure random numbers to fill the gap.
// Must be imported before the Supabase client is created.
installWebCryptoShim(globalThis as Parameters<typeof installWebCryptoShim>[0], {
  algorithms: Object.values(ExpoCrypto.CryptoDigestAlgorithm),
  digest: (algorithm, data) => ExpoCrypto.digest(algorithm as ExpoCrypto.CryptoDigestAlgorithm, data),
  getRandomValues: (array) => ExpoCrypto.getRandomValues(array as unknown as Uint8Array) as unknown as typeof array,
});
