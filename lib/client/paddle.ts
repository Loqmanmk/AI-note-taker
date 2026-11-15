import type { PaddlePublicConfig } from "../paymentsConfig";

/** The parts of Paddle.js (https://cdn.paddle.com/paddle/v2/paddle.js) this site uses. */
type PaddleEvent = { name?: string };
type PaddleJs = {
  Environment: { set(environment: "sandbox"): void };
  Initialize(options: {
    token: string;
    eventCallback?: (event: PaddleEvent) => void;
  }): void;
  Checkout: {
    open(options: {
      items: { priceId: string; quantity: number }[];
      customer?: { email: string };
      customData?: Record<string, string>;
      settings?: {
        displayMode?: "overlay";
        theme?: "light" | "dark";
        allowLogout?: boolean;
      };
    }): void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleJs;
  }
}

export const PADDLE_SCRIPT_URL = "https://cdn.paddle.com/paddle/v2/paddle.js";

let initialized = false;
let onCompleted: (() => void) | undefined;
let onClosed: (() => void) | undefined;

/** Sets Paddle up once, after its script has loaded. Returns false if the script is not there. */
export function initPaddle(config: PaddlePublicConfig): boolean {
  const paddle = window.Paddle;
  if (!paddle) return false;
  if (!initialized) {
    if (config.environment === "sandbox") paddle.Environment.set("sandbox");
    paddle.Initialize({
      token: config.clientToken,
      eventCallback: (event) => {
        if (event.name === "checkout.completed") onCompleted?.();
        if (event.name === "checkout.closed") onClosed?.();
      },
    });
    initialized = true;
  }
  return true;
}

/**
 * Opens Paddle's payment window for a plan. The student's id travels with the purchase, so
 * Paddle's notification tells the server whose plan to upgrade.
 */
export function openCheckout(
  priceId: string,
  user: { id: string; email?: string },
  handlers: { completed: () => void; closed: () => void },
) {
  onCompleted = handlers.completed;
  onClosed = handlers.closed;
  window.Paddle?.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: user.email ? { email: user.email } : undefined,
    customData: { user_id: user.id },
    settings: { displayMode: "overlay", allowLogout: false },
  });
}
