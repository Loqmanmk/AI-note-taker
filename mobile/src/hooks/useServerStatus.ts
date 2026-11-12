import { useCallback, useEffect, useState } from "react";
import { isServerReachable } from "@/lib/api";

export type ServerStatus = "checking" | "connected" | "unreachable";

/** Checks the connection to the server when the screen opens, and again on request. */
export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    isServerReachable().then((reachable) => {
      if (!cancelled) setStatus(reachable ? "connected" : "unreachable");
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("checking");
    setAttempt((n) => n + 1);
  }, []);

  return { status, retry };
}
