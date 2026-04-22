import { pushEffect, popEffect, type Effect } from "./signal.js";
import { queueEffect } from "../scheduler/queue.js";

export function cleanup(effect: Effect) {
    for (const dep of effect.deps) {
        dep.delete(effect);
    }
    effect.deps.length = 0;
}

export function createEffect(fn: () => void) {
    const effect: Effect = function () {
        cleanup(effect);

        pushEffect(effect);
        fn();
        popEffect();
    } as Effect;

    effect.deps = [];
    effect.run = effect;

    // Schedule the effect
    effect.scheduler = () => {
        queueEffect(effect);
    };

    // initial run
    effect.run();

    function dispose() {
        cleanup(effect);
    }

    return dispose;
}