import { describe, expect, it } from "vitest";
import { AuthUnavailableError, type AuthVerifier } from "../lib/server/auth";
import { authenticate, bearerToken } from "../lib/server/requestAuth";

const request = (authorization?: string) =>
  new Request("http://test/api/notes", { headers: authorization ? { authorization } : {} });

/** Accepts only the token "good". */
const verifier: AuthVerifier = {
  verify: async (token) => (token === "good" ? { id: "user-1", accessToken: token } : null),
};

describe("bearerToken", () => {
  it("reads a bearer token and ignores anything else", () => {
    expect(bearerToken(request("Bearer abc.def"))).toBe("abc.def");
    expect(bearerToken(request("bearer abc"))).toBe("abc");
    expect(bearerToken(request("Basic abc"))).toBeUndefined();
    expect(bearerToken(request("Bearer"))).toBeUndefined();
    expect(bearerToken(request())).toBeUndefined();
  });
});

describe("authenticate", () => {
  it("lets a student with a valid token in", async () => {
    expect(await authenticate(request("Bearer good"), verifier, true)).toEqual({
      ok: true,
      user: { id: "user-1", accessToken: "good" },
    });
  });

  it("asks to sign in when the token is missing or invalid", async () => {
    expect(await authenticate(request(), verifier, true)).toMatchObject({ ok: false, status: 401 });
    expect(await authenticate(request("Bearer forged"), verifier, true)).toMatchObject({ ok: false, status: 401 });
  });

  it("does not sign the student out when the sign-in service is down", async () => {
    const down: AuthVerifier = {
      verify: async () => {
        throw new AuthUnavailableError();
      },
    };
    expect(await authenticate(request("Bearer good"), down, true)).toMatchObject({ ok: false, status: 503 });
  });

  it("allows anonymous use only when accounts are off and not required", async () => {
    expect(await authenticate(request(), null, false)).toEqual({ ok: true, user: null });
    expect(await authenticate(request(), null, true)).toMatchObject({ ok: false, status: 500 });
  });
});
