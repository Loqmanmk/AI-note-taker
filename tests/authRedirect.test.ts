import { describe, expect, it } from "vitest";
import { expoGoReturnAddress, parseAuthRedirect } from "../lib/authRedirect";

describe("parseAuthRedirect", () => {
  it("reads the code from the query string", () => {
    expect(parseAuthRedirect("focusnotes://?code=abc123")).toEqual({ code: "abc123", error: undefined });
    expect(parseAuthRedirect("exp://192.168.1.5:8081?code=a%2Bb&state=x")).toEqual({ code: "a+b", error: undefined });
  });

  it("reads an error from the query or the fragment, preferring its description", () => {
    expect(parseAuthRedirect("focusnotes://?error=access_denied").error).toBe("access_denied");
    expect(
      parseAuthRedirect("exp://host:8081#error=server_error&error_description=Unable+to+exchange").error,
    ).toBe("Unable to exchange");
  });

  it("returns nothing for a link without a result", () => {
    expect(parseAuthRedirect("focusnotes://")).toEqual({ code: undefined, error: undefined });
  });
});

describe("expoGoReturnAddress", () => {
  it("points at the development server Expo Go loaded the app from", () => {
    expect(expoGoReturnAddress("192.168.1.20:8081")).toBe("exp://192.168.1.20:8081");
    expect(expoGoReturnAddress("192.168.1.20:8081/--/")).toBe("exp://192.168.1.20:8081");
    expect(expoGoReturnAddress("exp://10.0.0.5:8081")).toBe("exp://10.0.0.5:8081");
  });

  it("returns nothing without a server address", () => {
    expect(expoGoReturnAddress(undefined)).toBeUndefined();
    expect(expoGoReturnAddress("  ")).toBeUndefined();
  });
});
