import { describe, it, expect, vi } from "vitest";
import { createSignal } from "../core/signal.js";
import { createEffect } from "../core/effect.js";
import { createComputed } from "../core/computed.js";
import { batch, queueEffect } from "../scheduler/queue.js";

// --- Signal ---

describe("createSignal", () => {
    it("returns initial value", () => {
        const s = createSignal(42);
        expect(s.get()).toBe(42);
    });

    it("updates value with set", () => {
        const s = createSignal(1);
        s.set(2);
        expect(s.get()).toBe(2);
    });

    it("skips update when value is the same (Object.is)", () => {
        const listener = vi.fn();
        const s = createSignal(1);
        s.subscribe(listener);
        s.set(1);
        expect(listener).not.toHaveBeenCalled();
    });

    it("peek returns value without tracking", async () => {
        const s = createSignal(10);
        const log: number[] = [];

        createEffect(() => {
            log.push(s.peek());
        });

        // Initial run should have read 10
        expect(log).toEqual([10]);

        // Changing the signal should NOT re-trigger the effect
        // because peek() was used instead of get()
        s.set(20);
        await flushMicrotasks();
        expect(log).toEqual([10]);
    });

    it("subscribe notifies plain listeners on set", () => {
        const s = createSignal("a");
        const listener = vi.fn();
        const unsub = s.subscribe(listener);

        s.set("b");
        expect(listener).toHaveBeenCalledTimes(1);

        unsub();
        s.set("c");
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

// --- Effect ---

describe("createEffect", () => {
    it("runs immediately on creation", () => {
        const log: number[] = [];
        const s = createSignal(1);

        createEffect(() => {
            log.push(s.get());
        });

        expect(log).toEqual([1]);
    });

    it("re-runs when dependency changes (via microtask scheduler)", async () => {
        const log: number[] = [];
        const s = createSignal(1);

        createEffect(() => {
            log.push(s.get());
        });

        s.set(2);
        await flushMicrotasks();
        expect(log).toEqual([1, 2]);
    });

    it("dispose stops tracking", async () => {
        const log: number[] = [];
        const s = createSignal(1);

        const dispose = createEffect(() => {
            log.push(s.get());
        });

        expect(log).toEqual([1]);

        dispose();

        s.set(2);
        await flushMicrotasks();
        // effect should not have re-run
        expect(log).toEqual([1]);
    });

    it("tracks dynamic dependencies", async () => {
        const toggle = createSignal(true);
        const a = createSignal("A");
        const b = createSignal("B");
        const log: string[] = [];

        createEffect(() => {
            log.push(toggle.get() ? a.get() : b.get());
        });

        expect(log).toEqual(["A"]);

        // Changing b should NOT trigger since toggle is true
        b.set("B2");
        await flushMicrotasks();
        expect(log).toEqual(["A"]);

        // Switch to b branch
        toggle.set(false);
        await flushMicrotasks();
        expect(log).toEqual(["A", "B2"]);

        // Now changing a should NOT trigger
        a.set("A2");
        await flushMicrotasks();
        expect(log).toEqual(["A", "B2"]);

        // But b should
        b.set("B3");
        await flushMicrotasks();
        expect(log).toEqual(["A", "B2", "B3"]);
    });
});

// --- Computed ---

describe("createComputed", () => {
    it("computes lazily", () => {
        const s = createSignal(3);
        const computeFn = vi.fn(() => s.get() * 2);
        const c = createComputed(computeFn);

        // not computed yet (lazy)
        expect(computeFn).not.toHaveBeenCalled();

        expect(c.get()).toBe(6);
        expect(computeFn).toHaveBeenCalledTimes(1);

        // second read reuses cached value
        expect(c.get()).toBe(6);
        expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it("recomputes when dependency changes", async () => {
        const s = createSignal(2);
        const c = createComputed(() => s.get() * 10);

        expect(c.get()).toBe(20);

        s.set(5);
        // computed is lazy — dirty flag set, recomputes on next get
        expect(c.get()).toBe(50);
    });

    it("tracks downstream effects", async () => {
        const s = createSignal(1);
        const c = createComputed(() => s.get() + 100);
        const log: number[] = [];

        createEffect(() => {
            log.push(c.get());
        });

        expect(log).toEqual([101]);

        s.set(2);
        await flushMicrotasks();
        expect(log).toEqual([101, 102]);
    });

    it("peek returns value without tracking", () => {
        const s = createSignal(5);
        const c = createComputed(() => s.get() * 3);
        const log: number[] = [];

        createEffect(() => {
            log.push(c.peek());
        });

        expect(log).toEqual([15]);

        s.set(10);
        // Effect should NOT re-run because we used peek
        expect(log).toEqual([15]);
    });

    it("subscribe notifies plain listeners when dirty", () => {
        const s = createSignal(1);
        const c = createComputed(() => s.get() * 2);
        const listener = vi.fn();

        // prime the computed
        c.get();

        const unsub = c.subscribe(listener);

        s.set(2);
        expect(listener).toHaveBeenCalledTimes(1);

        unsub();
        s.set(3);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("glitch-free: no intermediate values in effect", async () => {
        const a = createSignal(1);
        const b = createSignal(1);
        const sum = createComputed(() => a.get() + b.get());
        const log: number[] = [];

        createEffect(() => {
            log.push(sum.get());
        });

        expect(log).toEqual([2]);

        // Update both in same tick
        a.set(2);
        b.set(2);
        await flushMicrotasks();
        // Should see 4, not intermediate 3
        expect(log).toEqual([2, 4]);
    });
});

// --- Batch ---

describe("batch", () => {
    it("defers effect execution until batch completes", () => {
        const s = createSignal(0);
        const log: number[] = [];

        createEffect(() => {
            log.push(s.get());
        });

        expect(log).toEqual([0]);

        batch(() => {
            s.set(1);
            s.set(2);
            s.set(3);
            // effect should not have run yet
            expect(log).toEqual([0]);
        });

        // After batch, effect runs synchronously with final value
        expect(log).toEqual([0, 3]);
    });

    it("nested batches only flush at outermost", () => {
        const s = createSignal(0);
        const log: number[] = [];

        createEffect(() => {
            log.push(s.get());
        });

        expect(log).toEqual([0]);

        batch(() => {
            s.set(1);
            batch(() => {
                s.set(2);
                // still inside outer batch
                expect(log).toEqual([0]);
            });
            // inner batch ended but outer still open
            expect(log).toEqual([0]);
            s.set(3);
        });

        expect(log).toEqual([0, 3]);
    });
});

// --- Utility ---

function flushMicrotasks() {
    return new Promise<void>((resolve) => queueMicrotask(resolve));
}
