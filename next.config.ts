import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** The browser talks to Supabase directly for sign-in and saved classes. */
function originOf(url: string | undefined): string | undefined {
  try {
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
}
const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

/** Paddle's checkout: its script, the payment window it opens, and the services they call. */
const paddle = {
  script: "https://cdn.paddle.com https://public.profitwell.com",
  frame: "https://buy.paddle.com https://sandbox-buy.paddle.com",
  connect: "https://*.paddle.com",
};

// Next.js injects small inline scripts, and its dev server needs eval for hot reload.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${paddle.script}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://cdn.paddle.com",
  "img-src 'self' data: https://*.paddle.com",
  "font-src 'self'",
  `frame-src ${paddle.frame}`,
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""} ${paddle.connect}${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The microphone for recording; payment for Apple Pay and Google Pay in Paddle's checkout.
  {
    key: "Permissions-Policy",
    value:
      'microphone=(self), camera=(), geolocation=(), payment=(self "https://buy.paddle.com" "https://sandbox-buy.paddle.com")',
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/**
 * This computer's own addresses on the local network.
 * Lets a phone on the same Wi-Fi open the development site at http://<address>:3000.
 */
function localNetworkAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net?.family === "IPv4" && !net.internal)
    .map((net) => net!.address);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: isDev ? localNetworkAddresses() : [],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
