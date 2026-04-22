const effectStack: Effect[] = [];

export type Effect = {
    (): void;
    deps: Set<Effect>[];
    run: () => void;
    scheduler?: () => void;
};

export function pushEffect(effect: Effect) {
    effectStack.push(effect);
}

export function popEffect() {
    effectStack.pop();
}

export function getCurrentEffect(): Effect | null {
    return effectStack[effectStack.length - 1] ?? null;
}

export type Signal<T> = {
    get: () => T;
    set: (newValue: T) => void;
    peek: () => T;
    subscribe: (listener: () => void) => () => void;
};

export function createSignal<T>(initialValue: T): Signal<T> {
    let value = initialValue;
    const subscribers = new Set<Effect>();
    const listeners = new Set<() => void>();

    function get(): T {
        const running = getCurrentEffect();
        if (running) {
            subscribers.add(running);
            running.deps.push(subscribers);
        }
        return value;
    }

    function peek(): T {
        return value;
    }

    function set(newValue: T) {
        if (Object.is(value, newValue)) return;

        value = newValue;

        // Snapshot before iterating — prevents infinite loops when
        // a subscriber is removed and re-added during notification
        for (const effect of [...subscribers]) {
            if (effect.scheduler) {
                effect.scheduler();
            } else {
                effect.run();
            }
        }

        // Notify plain listeners (React, external consumers)
        for (const listener of [...listeners]) {
            listener();
        }
    }

    function subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    return { get, set, peek, subscribe };
}