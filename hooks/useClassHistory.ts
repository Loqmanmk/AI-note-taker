import { useSyncExternalStore } from "react";
import { historyStore } from "@/lib/client/historyStore";
import type { SavedClass } from "@/lib/schema";

export function useClassHistory() {
  const items = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot,
  );
  return {
    items,
    add: (item: SavedClass) => historyStore.add(item),
    remove: (id: string) => historyStore.remove(id),
  };
}
