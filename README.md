# fineact

Fine-grained reactive signals for React with automatic dependency tracking.

Skip the virtual DOM diff for the data that changes most. Fineact gives you **signals**, **computed values**, and **effects** with automatic dependency tracking, a microtask-based scheduler, and first-class React integration via `useSyncExternalStore`.

## Why fineact?

React re-renders entire component subtrees when state changes. For most UI that's fine — but for **live dashboards, real-time charts, animations, form validation, and high-frequency counters**, it's the bottleneck.

**fineact lets you choose your tradeoff per component:**

```
┌─────────────────────────────────────────────────────────────────┐
│  useSignalValue()     Normal React re-render, but only the     │
│                       components that actually read the signal. │
│                       Zero prop-drilling. Zero context.         │
│                                                                 │
│  useText() / bindText()   Bypass React entirely. Write to the  │
│                            DOM directly. Zero re-renders.       │
│                            60fps with 1000+ nodes updating.     │
└─────────────────────────────────────────────────────────────────┘
```

**What makes it different:**

- **Surgical updates** — Only the exact components reading a signal re-render. No `memo()` gymnastics, no selector functions, no context splitting.
- **Escape hatch to raw DOM** — `useText` and `bindText` write `textContent` directly, skipping reconciliation completely. Use it where React is too slow.
- **Zero dependencies** — The core is ~2KB with no dependencies. React hooks are a thin layer on `useSyncExternalStore`.
- **Glitch-free computed** — Derived values never expose intermediate states. Diamond dependency graphs just work.
- **Synchronous batching** — `batch()` defers all effects and flushes once. Predictable, debuggable.
- **Works with React 18 & 19** — Built on `useSyncExternalStore`, concurrent-mode safe.

## Use Cases

Fineact is a general-purpose reactive primitives library. Here are the scenarios where it shines:

### Real-time & high-frequency UI

| Use case | Why fineact helps |
|---|---|
| **Live dashboards** | Metrics updating every second? `useText` writes directly to the DOM — zero re-renders, 60fps even with hundreds of data points. |
| **Stock tickers / crypto prices** | Price feeds push dozens of updates per second. Signals dedupe by value (`Object.is`), and `bindText` keeps the DOM in sync without touching React. |
| **Chat & collaboration apps** | Typing indicators, presence dots, unread counts — small, frequent mutations that don't justify a full subtree re-render. |
| **Multiplayer / game state** | Sync player positions, scores, and timers at 30–60fps. Signals + `useText` keep the render loop out of React. |
| **Live sports scores / leaderboards** | Scores ticking in real time across many rows. Each cell updates independently via signals. |

### Forms & validation

| Use case | Why fineact helps |
|---|---|
| **Complex multi-step forms** | Shared form state across steps without prop-drilling or context. Computed values derive "is valid" and "summary" automatically. |
| **Real-time field validation** | Computed values derive per-field and whole-form validity on every keystroke with no extra wiring. |
| **Dependent dropdowns / conditional fields** | Dynamic dependency tracking means effects re-track on every run — show/hide fields based on other field values reactively. |
| **Character counters & live previews** | `bindText` updates the counter DOM node directly while the user types. No re-render of the form tree. |

### State management

| Use case | Why fineact helps |
|---|---|
| **Global app state (alternative to Redux/Zustand)** | Signals are framework-agnostic stores. `useSignalValue` subscribes individual components. No reducers, no selectors, no boilerplate. |
| **Cross-component communication** | Two unrelated components can read the same signal. No context providers, no event buses. |
| **Undo/redo systems** | Store history as a signal of snapshots. Computed values derive the current state. `batch` ensures atomic multi-field updates. |
| **Feature flags / A-B testing** | A single signal drives conditional rendering across the app. Change it once — every consumer reacts. |

### Animations & transitions

| Use case | Why fineact helps |
|---|---|
| **Progress bars & loading indicators** | `useText` or `bindText` to update width/percentage text at 60fps without React reconciliation. |
| **Scroll-driven animations** | Scroll position as a signal → computed values for parallax offsets, opacity, scale — all derived automatically. |
| **Countdown timers** | A timer signal ticking every 100ms. `useText` renders it. Zero component re-renders. |
| **Drag-and-drop coordinates** | Mouse position signals drive computed transforms. `batch` groups x/y updates into one effect flush. |

### Data-heavy tables & lists

| Use case | Why fineact helps |
|---|---|
| **Spreadsheet-like grids** | Each cell reads its own signal. Editing one cell re-renders only that cell, not the entire table. |
| **Sortable / filterable lists** | Source data in a signal, sort/filter as computed values. Changing the filter recomputes the derived list — no manual memoization. |
| **Infinite scroll with live updates** | New items pushed into a signal array. Only the list component subscribes — the rest of the page is untouched. |
| **Virtualized lists with live data** | Combine with a virtualizer — signals update visible row data without re-rendering the container. |

### Server-driven & external data

| Use case | Why fineact helps |
|---|---|
| **WebSocket / SSE streams** | Pipe incoming messages into `signal.set()` inside a `batch`. The reactive graph handles the rest. |
| **Polling endpoints** | Timer-based fetch → `signal.set(data)`. Computed values derive UI state. Effects trigger side-effects (notifications, sounds). |
| **Shared state across tabs** | `BroadcastChannel` + signals: receive in one handler, set the signal, every subscriber reacts. |
| **Offline-first sync** | Local signal state + sync effect that persists to IndexedDB and reconciles on reconnect. |

### Non-React / universal

| Use case | Why fineact helps |
|---|---|
| **Vanilla JS / Web Components** | `fineact/core` has zero dependencies. Use `createEffect` to write to any DOM node. |
| **Node.js / server-side logic** | Reactive data pipelines, computed caches, effect-driven logging — signals aren't DOM-specific. |
| **CLI tools** | Reactive config: load signals from env/flags, computed values derive final config, effects trigger actions. |
| **Testing & mocking** | Signals are plain objects. Set values, read computed results, assert — no rendering needed. |

---

## Install

```bash
npm install fineact
```

> **Peer dependency:** React 18 or 19

## Quick start

```ts
import { createSignal, createComputed, createEffect } from "fineact";

const count = createSignal(0);
const double = createComputed(() => count.get() * 2);

createEffect(() => {
  console.log("double is", double.get());
});
// logs: "double is 0"

count.set(5);
// logs: "double is 10" (after microtask flush)
```

## API

### `createSignal<T>(initialValue): Signal<T>`

Creates a reactive signal.

```ts
const name = createSignal("world");

name.get();       // "world" — reads value and tracks dependency
name.peek();      // "world" — reads value without tracking
name.set("foo");  // updates value and notifies subscribers
name.subscribe(() => { /* called on every change */ });
```

| Method | Description |
|---|---|
| `get()` | Returns the current value. Registers the calling effect/computed as a dependency. |
| `peek()` | Returns the current value **without** tracking. Useful for logging or conditional reads. |
| `set(value)` | Updates the value. Skipped if `Object.is(old, new)` is true. Notifies all subscribers. |
| `subscribe(listener)` | Registers a plain `() => void` callback. Returns an unsubscribe function. Used internally by the React hooks. |

---

### `createComputed<T>(fn): Computed<T>`

Creates a lazy derived value that recomputes only when its dependencies change.

```ts
const count = createSignal(2);
const doubled = createComputed(() => count.get() * 2);

doubled.get();  // 4 — computes on first read, caches afterward
doubled.peek(); // 4 — reads cached value without tracking
```

Computed values are **glitch-free** — they mark themselves dirty and propagate the dirty signal to downstream subscribers without running eagerly, so effects always see a consistent state.

| Method | Description |
|---|---|
| `get()` | Returns the (possibly recomputed) value. Tracks dependency. |
| `peek()` | Returns the (possibly recomputed) value **without** tracking. |
| `subscribe(listener)` | Plain callback notified when the computed goes dirty. Returns unsubscribe. |

---

### `createEffect(fn): dispose`

Creates a reactive side-effect that re-runs when its dependencies change.

```ts
const count = createSignal(0);

const dispose = createEffect(() => {
  console.log(count.get());
});
// logs: 0

count.set(1);
// logs: 1 (scheduled via microtask)

dispose(); // stops the effect, cleans up all subscriptions
```

- Runs **immediately** on creation.
- Re-executes are **batched** via the microtask scheduler (deduped per tick).
- Dependencies are **dynamic** — they are re-tracked on every run, so conditional branches work correctly.
- Returns a **`dispose`** function to tear down the effect and prevent memory leaks.

---

### `batch(fn)`

Synchronously batches multiple signal updates. Effects are deferred and deduped until the outermost batch completes, then flushed synchronously.

```ts
import { batch } from "fineact";

batch(() => {
  count.set(1);
  name.set("hello");
  // no effects run here
});
// effects run once here with final values
```

Batches can be nested — only the outermost `batch` triggers the flush.

---

## React hooks

### `useSignalValue<T>(signal): T`

Reads a signal inside a React component. Re-renders the component when the signal changes. Built on `useSyncExternalStore` for concurrent-mode safety.

```tsx
import { useSignalValue } from "fineact/react";

function Counter({ count }: { count: Signal<number> }) {
  const value = useSignalValue(count);
  return <p>{value}</p>;
}
```

### `useComputed<T>(fn): T`

Creates a computed value scoped to a React component and subscribes to it. The computed is memoized for the component's lifetime.

```tsx
import { useComputed } from "fineact/react";

function DoubleDisplay({ count }: { count: Signal<number> }) {
  const doubled = useComputed(() => count.get() * 2);
  return <p>{doubled}</p>;
}
```

---

## DOM bindings

For performance-critical updates, skip React's reconciliation entirely and mutate the DOM directly.

### `useText(source): ref`

A React hook that returns a ref. Attaches a reactive effect on mount that writes `textContent` directly.

```tsx
import { useText } from "fineact/dom";

function FastCounter({ count }: { count: Signal<number> }) {
  const ref = useText(() => count.get());
  return <span ref={ref} />;
}
```

### `bindText(source): callbackRef`

A callback-ref version for inline use. No hook needed.

```tsx
import { bindText } from "fineact/dom";

function FastCounter({ count }: { count: Signal<number> }) {
  return <span ref={bindText(() => count.get())} />;
}
```

---

## Entry points

| Import path | Contents |
|---|---|
| `fineact` | Everything |
| `fineact/core` | `createSignal`, `createEffect`, `createComputed`, `batch` — no React dependency |
| `fineact/react` | `useSignalValue`, `useComputed` |
| `fineact/dom` | `useText`, `bindText` |

---

## Development

```bash
npm install        # install dependencies
npm run build      # build with tsup (ESM + CJS + .d.ts)
npm run dev        # watch mode
npm test           # run tests (vitest)
npm run test:watch # watch mode tests
```

## Examples

Three polished React apps in `examples/` — copy into a React 18+ project with fineact installed:

- **`react-playground.tsx`** — Interactive playground demonstrating every core API: signals, computed, effects, dispose, dynamic deps, batch, and glitch-free propagation
- **`react-todo-app.tsx`** — Todo app with filters, stats, and `bindText` for zero-rerender counters
- **`react-dashboard.tsx`** — Live metrics dashboard with `useText`-powered cards that update without React re-renders

---

## Benchmarks

### Core reactive system

Run locally:

```bash
npx tsx benchmarks/core-benchmark.ts
```

| Benchmark | ops/s |
|---|---|
| `signal.get()` | 12,356,160 |
| `signal.peek()` | 197,413,880 |
| `signal.set()` — changing value | 4,413,141 |
| `signal.set()` — same value (skipped) | 216,108,750 |
| `set()` with 1 effect | 475,125 |
| `set()` with 10 effects | 569,223 |
| `set()` with 100 effects | 116,382 |
| `set()` with 1,000 effects | 8,862 |
| Computed chain depth=1 | 416,647 |
| Computed chain depth=10 | 136,944 |
| Computed chain depth=50 | 23,451 |
| Diamond graph (1 → 2 → 1) | 386,652 |
| Wide diamond (1 → 100 → 1) | 9,034 |
| Dynamic dep switching | 2,384,097 |
| `createEffect` + dispose | 248,598 |

### React comparison — useState vs useSignalValue vs useText

`benchmarks/react-benchmark.tsx` renders 200 items updated every frame for 5 seconds and compares three approaches:

| Approach | How it works | Expected result |
|---|---|---|
| **React `useState`** | `setCounter` re-renders parent + 200 children every frame | Baseline FPS, highest render count |
| **fineact `useSignalValue`** | Signal notifies 200 components via `useSyncExternalStore` | Similar or better FPS, targeted re-renders only |
| **fineact `useText`** | Signal writes `textContent` directly to 200 DOM nodes | **Highest FPS, zero React re-renders** |

To run: drop `benchmarks/react-benchmark.tsx` into a React 18+ project and render `<BenchmarkApp />`.

The `useText` approach is where fineact shines most — it completely bypasses React's reconciliation for data that changes frequently (counters, timers, live metrics, animations).

## License

MIT
