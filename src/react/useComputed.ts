import { useMemo, useEffect } from "react";
import { useSyncExternalStore } from "react";
import { createComputed, type Computed } from "../core/computed.js";

export function useComputed<T>(fn: () => T): T {
    const computed = useMemo(() => createComputed(fn), []);

    return useSyncExternalStore(
        computed.subscribe,
        computed.get,
        computed.get // SSR: getServerSnapshot
    );
}
