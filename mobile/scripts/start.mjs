// Starts Expo so that Google sign-in can return to the app in Expo Go.
//
// Supabase refuses sign-in return addresses that contain a raw IP address (only 127.0.0.1 is
// allowed), and Expo Go's address is normally exp://<computer IP>:8081. So this script announces
// the computer under a name instead: sslip.io turns "192-168-1-20.sslip.io" into 192.168.1.20.
// If the network cannot resolve that name, it falls back to the IP and says what that means.
//
// Usage: npm start (extra arguments are passed to "expo start", e.g. npm start -- --clear)
import { spawn } from "node:child_process";
import { createSocket } from "node:dgram";
import { lookup } from "node:dns/promises";
import { networkInterfaces } from "node:os";

const PRIVATE = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];
// Virtual adapters the phone cannot reach (VirtualBox uses 192.168.56.x, for example).
const VIRTUAL = /virtualbox|vmware|vethernet|hyper-v|wsl|docker|vbox|loopback|tailscale|zerotier|vpn/i;

/**
 * The address of the network card that carries this computer's internet traffic.
 * Connecting a UDP socket sends nothing, but makes the system pick the outgoing interface.
 */
function routedAddress() {
  return new Promise((resolve) => {
    const socket = createSocket("udp4");
    const done = (address) => {
      try {
        socket.close();
      } catch {}
      resolve(address);
    };
    socket.on("error", () => done(undefined));
    socket.connect(53, "8.8.8.8", () => {
      const { address } = socket.address();
      done(PRIVATE.some((range) => range.test(address)) ? address : undefined);
    });
    setTimeout(() => done(undefined), 2000);
  });
}

/** Otherwise, a private address on a card that is not obviously virtual, preferring home Wi-Fi ranges. */
function likelyLanAddress() {
  const candidates = Object.entries(networkInterfaces())
    .filter(([name]) => !VIRTUAL.test(name))
    .flatMap(([, nets]) => nets ?? [])
    .filter((net) => net.family === "IPv4" && !net.internal && !net.address.startsWith("192.168.56."))
    .map((net) => net.address);
  for (const range of PRIVATE) {
    const match = candidates.find((ip) => range.test(ip));
    if (match) return match;
  }
  return candidates[0];
}

async function lanAddress() {
  return (await routedAddress()) ?? likelyLanAddress();
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

  const ip = await lanAddress();
  if (!ip) return undefined;
  const hostname = `${ip.replaceAll(".", "-")}.sslip.io`;

  if (await resolvesTo(hostname, ip)) {
    console.log(`\nFocusNotes: the phone will reach this computer as ${hostname} (${ip}).`);
    console.log("FocusNotes: if that is not your Wi-Fi address, set REACT_NATIVE_PACKAGER_HOSTNAME yourself.");
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
// Windows needs a shell to run npx; pass one quoted command line rather than an argument list.
const args = ["expo", "start", ...process.argv.slice(2)];
const child =
  process.platform === "win32"
    ? spawn(["npx", ...args].map((arg) => (/^[\w@./:=-]+$/.test(arg) ? arg : `"${arg.replaceAll('"', '\\"')}"`)).join(" "), {
        stdio: "inherit",
        env,
        shell: true,
      })
    : spawn("npx", args, { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
