// Starts Expo so that Google sign-in can return to the app in Expo Go.
//
// Supabase refuses sign-in return addresses that contain a raw IP address (only 127.0.0.1 is
// allowed), and Expo Go's address is normally exp://<computer IP>:8081. So this script announces
// the computer under a name instead: sslip.io turns "192-168-1-20.sslip.io" into 192.168.1.20.
// If the network cannot resolve that name, it falls back to the IP and says what that means.
//
// Usage: npm start (extra arguments are passed to "expo start", e.g. npm start -- --clear)
import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { networkInterfaces } from "node:os";

const PRIVATE = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];

/** This computer's address on the local network, preferring home and office ranges. */
function lanAddress() {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => net.address);
  // Ranges in order of preference: 192.168.x is the usual home and school Wi-Fi, while 172.x is
  // often a virtual network (WSL, Docker, VirtualBox) the phone cannot reach.
  for (const range of PRIVATE) {
    const match = addresses.find((ip) => range.test(ip));
    if (match) return match;
  }
  return addresses[0];
}

async function resolvesTo(hostname, ip) {
  try {
    const result = await Promise.race([
      lookup(hostname, { family: 4 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    return result.address === ip;
  } catch {
    return false;
  }
}

async function chooseHostname() {
  if (process.env.REACT_NATIVE_PACKAGER_HOSTNAME) return process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  if (process.argv.includes("--tunnel")) return undefined; // A tunnel already uses a name.

  const ip = lanAddress();
  if (!ip) return undefined;
  const hostname = `${ip.replaceAll(".", "-")}.sslip.io`;

  if (await resolvesTo(hostname, ip)) {
    console.log(`\nFocusNotes: the phone will reach this computer as ${hostname} (${ip}).`);
    console.log("FocusNotes: Google sign-in can return to Expo Go. Supabase must allow exp://** .\n");
    return hostname;
  }
  console.warn(`\nFocusNotes: this network cannot resolve ${hostname}, so the IP address ${ip} is used.`);
  console.warn("FocusNotes: the app works, but Google sign-in cannot return to Expo Go with an IP address.");
  console.warn('FocusNotes: to sign in, try another network or run "npm start -- --tunnel".\n');
  return undefined;
}

const hostname = await chooseHostname();
const env = hostname ? { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: hostname } : process.env;
const child = spawn("npx", ["expo", "start", ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
  // Windows needs a shell to find npx.
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
