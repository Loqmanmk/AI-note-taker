import { useSyncExternalStore } from "react";
import { sendQueue } from "@/lib/sendQueue";

/** Recordings waiting for their notes, for the signed-in student. */
export function useSendQueue() {
  const entries = useSyncExternalStore(sendQueue.subscribe, sendQueue.getSnapshot, sendQueue.getSnapshot);
  return {
    entries,
    retry: (id: string) => sendQueue.retry(id),
    discard: (id: string) => sendQueue.discard(id),
  };
}
