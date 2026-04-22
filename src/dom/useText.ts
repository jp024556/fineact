import { useRef, useEffect } from "react";
import { type Effect, pushEffect, popEffect } from "../core/signal.js";
import { cleanup } from "../core/effect.js";
import { queueEffect } from "../scheduler/queue.js";

export function useText<T, E extends HTMLElement = HTMLElement>(
    source: () => T
) {
    const ref = useRef<E | null>(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const effect: Effect = function () {
            cleanup(effect);

            pushEffect(effect);
            const value = source();
            popEffect();

            node.textContent = String(value);
        } as Effect;

        effect.deps = [];
        effect.run = effect;
        effect.scheduler = () => queueEffect(effect);

        effect.run();

        return () => cleanup(effect);
    }, []);

    return ref;
}