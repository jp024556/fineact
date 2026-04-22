import { useSyncExternalStore } from "react";

type Signal<T> = {
    get: () => T;
    subscribe: (listener: () => void) => () => void;
};

export function useSignalValue<T>(signal: Signal<T>): T {
    return useSyncExternalStore(
        signal.subscribe,
        signal.get,
        signal.get // SSR: getServerSnapshot
    );
}