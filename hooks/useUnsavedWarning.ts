import { useEffect } from "react";

/** Asks the browser to confirm before closing the tab while there is work that would be lost. */
export function useUnsavedWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
