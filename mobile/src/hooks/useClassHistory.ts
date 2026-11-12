import { useSyncExternalStore } from "react";
import { classStore } from "@/lib/classStore";

export function useClassHistory() {
  const state = useSyncExternalStore(classStore.subscribe, classStore.getSnapshot, classStore.getSnapshot);
  return {
    items: state.items,
    status: state.status,
    reload: () => classStore.reload(),
    remove: (id: string) => classStore.remove(id),
  };
}
