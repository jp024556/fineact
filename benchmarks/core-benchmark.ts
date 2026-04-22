import { createSignal, createComputed, createEffect, batch } from "../src/index.js";

// ─── Utilities ───

function bench(label: string, fn: () => void, iterations = 100_000) {
    // warmup
    for (let i = 0; i < 1000; i++) fn();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const elapsed = performance.now() - start;

    const opsPerSec = Math.round((iterations / elapsed) * 1000);
    console.log(`  ${label.padEnd(45)} ${opsPerSec.toLocaleString().padStart(12)} ops/s  (${elapsed.toFixed(1)}ms)`);
    return opsPerSec;
}

function separator(title: string) {
    console.log(`\n${"═".repeat(70)}`);
    console.log(`  ${title}`);
    console.log(`${"═".repeat(70)}`);
}

// ═══════════════════════════════════════════════════════════════
//  1. Signal read/write throughput
// ═══════════════════════════════════════════════════════════════

separator("1. Signal Read/Write (no subscribers)");

const bare = createSignal(0);

bench("signal.get()", () => { bare.get(); });
bench("signal.peek()", () => { bare.peek(); });
bench("signal.set(n) — changing value", () => { bare.set(bare.peek() + 1); });
bench("signal.set(n) — same value (skipped)", () => { bare.set(bare.peek()); });

// ═══════════════════════════════════════════════════════════════
//  2. Signal with N subscribers
// ═══════════════════════════════════════════════════════════════

separator("2. Signal.set() with subscribers");

for (const count of [1, 10, 100, 1000]) {
    const s = createSignal(0);
    const disposers: (() => void)[] = [];
    for (let i = 0; i < count; i++) {
        disposers.push(createEffect(() => { s.get(); }));
    }
    bench(`set() with ${count} effects`, () => { s.set(s.peek() + 1); }, 10_000);
    disposers.forEach((d) => d());
}

// ═══════════════════════════════════════════════════════════════
//  3. Computed chain depth
// ═══════════════════════════════════════════════════════════════

separator("3. Computed chain propagation");

for (const depth of [1, 5, 10, 50]) {
    const source = createSignal(0);
    let prev: { get: () => number } = source;
    for (let i = 0; i < depth; i++) {
        const upstream = prev;
        prev = createComputed(() => upstream.get() + 1);
    }
    const tail = prev;
    bench(`chain depth=${depth} — read after set`, () => {
        source.set(source.peek() + 1);
        tail.get();
    }, 50_000);
}

// ═══════════════════════════════════════════════════════════════
//  4. Diamond dependency graph (glitch-free)
// ═══════════════════════════════════════════════════════════════

separator("4. Diamond dependency graph");

{
    //       source
    //      /      \
    //   left     right
    //      \      /
    //       bottom

    const source = createSignal(0);
    const left = createComputed(() => source.get() * 2);
    const right = createComputed(() => source.get() * 3);
    const bottom = createComputed(() => left.get() + right.get());

    bench("diamond: set source + read bottom", () => {
        source.set(source.peek() + 1);
        bottom.get();
    }, 100_000);
}

// Wide diamond: 1 source → N computed → 1 aggregator
for (const width of [10, 100]) {
    const source = createSignal(0);
    const branches = Array.from({ length: width }, (_, i) =>
        createComputed(() => source.get() + i)
    );
    const aggregator = createComputed(() =>
        branches.reduce((sum, b) => sum + b.get(), 0)
    );

    bench(`wide diamond: width=${width} — set + read`, () => {
        source.set(source.peek() + 1);
        aggregator.get();
    }, 10_000);
}

// ═══════════════════════════════════════════════════════════════
//  5. Batch vs unbatched
// ═══════════════════════════════════════════════════════════════

separator("5. Batch vs unbatched — 10 signal updates, 1 effect each");

{
    const signals = Array.from({ length: 10 }, (_, i) => createSignal(i));
    const disposers = signals.map((s) => createEffect(() => { s.get(); }));

    bench("unbatched: 10 × set()", () => {
        signals.forEach((s) => s.set(s.peek() + 1));
    }, 10_000);

    bench("batched: batch(() => 10 × set())", () => {
        batch(() => {
            signals.forEach((s) => s.set(s.peek() + 1));
        });
    }, 10_000);

    disposers.forEach((d) => d());
}

// ═══════════════════════════════════════════════════════════════
//  6. Dynamic dependency switching
// ═══════════════════════════════════════════════════════════════

separator("6. Dynamic dependency switching");

{
    const toggle = createSignal(true);
    const a = createSignal(0);
    const b = createSignal(0);

    const dispose = createEffect(() => {
        if (toggle.get()) a.get();
        else b.get();
    });

    bench("switch branch + update active dep", () => {
        toggle.set(!toggle.peek());
        if (toggle.peek()) a.set(a.peek() + 1);
        else b.set(b.peek() + 1);
    }, 50_000);

    dispose();
}

// ═══════════════════════════════════════════════════════════════
//  7. Create + dispose lifecycle
// ═══════════════════════════════════════════════════════════════

separator("7. Create + dispose lifecycle");

{
    const s = createSignal(0);

    bench("createEffect + dispose", () => {
        const dispose = createEffect(() => { s.get(); });
        dispose();
    }, 50_000);

    bench("createComputed + read", () => {
        const c = createComputed(() => s.get() + 1);
        c.get();
    }, 50_000);
}

console.log(`\n${"═".repeat(70)}`);
console.log("  Done.");
console.log(`${"═".repeat(70)}\n`);
