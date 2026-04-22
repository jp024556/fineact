import { type Effect, pushEffect, popEffect } from "../core/signal.js";
import { cleanup } from "../core/effect.js";
import { queueEffect } from "../scheduler/queue.js";

export function bindText<T>(source: () => T) {
    return (node: HTMLElement | null) => {
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
    };
}