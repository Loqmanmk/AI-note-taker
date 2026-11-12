import { useSyncExternalStore } from "react";
import { classStore } from "@/lib/classStore";

export function useClassHistory() {
  const items = useSyncExternalStore(classStore.subscribe, classStore.getSnapshot, classStore.getSnapshot);
  return { items, remove: (id: string) => classStore.remove(id) };
}
