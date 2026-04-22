import { type Effect, pushEffect, popEffect, getCurrentEffect } from "./signal.js";
import { cleanup } from "./effect.js";

export type Computed<T> = {
    get: () => T;
    peek: () => T;
    subscribe: (listener: () => void) => () => void;
};

export function createComputed<T>(fn: () => T): Computed<T> {
    let value: T;
    let dirty = true;

    const subscribers = new Set<Effect>();
    const listeners = new Set<() => void>();

    const effect: Effect = function () {
        cleanup(effect);

        pushEffect(effect);
        value = fn();
        popEffect();

        dirty = false;
    } as Effect;

    effect.deps = [];
    effect.run = effect;

    // NEVER run subscribers directly
    effect.scheduler = () => {
        if (!dirty) {
            dirty = true;

            for (const sub of [...subscribers]) {
                if (sub.scheduler) {
                    sub.scheduler(); // schedule only
                }
            }

            // Notify plain listeners (React, external consumers)
            for (const listener of [...listeners]) {
                listener();
            }
        }
    };

    function get(): T {
        const running = getCurrentEffect();
        if (running) {
            subscribers.add(running);
            running.deps.push(subscribers);
        }
        if (dirty) {
            effect.run();
        }
        return value!;
    }

    function peek(): T {
        if (dirty) {
            effect.run();
        }
        return value!;
    }

    function subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    return { get, peek, subscribe };
}