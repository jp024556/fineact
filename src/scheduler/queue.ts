import type { Effect } from "../core/signal.js";

const queue = new Set<Effect>();
let isFlushing = false;
let batchDepth = 0;

function flush() {
    queue.forEach(effect => effect.run());
    queue.clear();
    isFlushing = false;
}

export function queueEffect(effect: Effect) {
    queue.add(effect);

    if (batchDepth > 0) return;

    if (!isFlushing) {
        isFlushing = true;
        queueMicrotask(flush);
    }
}

export function batch(fn: () => void) {
    batchDepth++;
    try {
        fn();
    } finally {
        batchDepth--;
        if (batchDepth === 0 && queue.size > 0) {
            flush();
        }
    }
}