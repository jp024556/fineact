// ─── React: Interactive Signals Playground ───
// Copy into a React 18+ project with fineact installed.
// Demonstrates every core API visually: signals, computed, effects, batch, peek, dispose.

import React, { useState, useRef, useCallback } from "react";
import { createSignal, createComputed, createEffect, batch } from "fineact/core";
import { useSignalValue, useComputed } from "fineact/react";
import { useText } from "fineact/dom";

// ─── Styles ───

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

  .playground {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    max-width: 800px;
    margin: 48px auto;
    padding: 0 24px;
    color: #0f172a;
  }
  .playground h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 4px;
  }
  .playground h1 span {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .playground .subtitle {
    color: #94a3b8;
    font-size: 14px;
    margin: 0 0 32px;
  }

  .demo-section {
    background: #fff;
    border: 1.5px solid #f1f5f9;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 16px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .demo-section:hover {
    border-color: #e2e8f0;
    box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  }
  .demo-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }
  .demo-number {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .demo-title {
    font-size: 17px;
    font-weight: 600;
  }
  .demo-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 16px;
  }
  .demo-desc code {
    background: #f1f5f9;
    padding: 1px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #6366f1;
  }

  .demo-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .demo-value {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 8px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 500;
    min-width: 80px;
    justify-content: center;
  }
  .demo-value.large {
    font-size: 28px;
    font-weight: 700;
    padding: 12px 24px;
    min-width: 100px;
  }
  .demo-value.highlight {
    background: #eef2ff;
    border-color: #c7d2fe;
    color: #4f46e5;
  }
  .demo-value.success {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #059669;
  }
  .demo-value.warn {
    background: #fffbeb;
    border-color: #fde68a;
    color: #d97706;
  }

  .demo-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
  }

  .demo-btn {
    padding: 8px 18px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: #0f172a;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.12s;
  }
  .demo-btn:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: #faf5ff;
  }
  .demo-btn:active { transform: scale(0.97); }
  .demo-btn.primary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    border-color: transparent;
  }
  .demo-btn.primary:hover {
    box-shadow: 0 4px 12px rgba(99,102,241,0.35);
    color: #fff;
  }
  .demo-btn.danger {
    border-color: #fecaca;
    color: #ef4444;
  }
  .demo-btn.danger:hover { background: #fef2f2; }

  .demo-log {
    background: #0f172a;
    border-radius: 10px;
    padding: 14px 16px;
    margin-top: 12px;
    max-height: 150px;
    overflow-y: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    line-height: 1.8;
    color: #94a3b8;
  }
  .demo-log .log-new { color: #a5f3fc; }
  .demo-log .log-label { color: #6366f1; }
  .demo-log-empty { color: #475569; font-style: italic; }

  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }
  .demo-stat {
    text-align: center;
    padding: 12px;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #f1f5f9;
  }
  .demo-stat .demo-label { margin-bottom: 4px; }

  .demo-divider {
    height: 1px;
    background: #f1f5f9;
    margin: 12px 0;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  1. Signals — read, write, peek
// ═══════════════════════════════════════════════════════════════

const counter = createSignal(0);

function SignalDemo() {
    const value = useSignalValue(counter);

    return (
        <div className="demo-section">
            <div className="demo-header">
                <div className="demo-number">1</div>
                <div className="demo-title">Signals</div>
            </div>
            <div className="demo-desc">
                <code>createSignal(0)</code> creates a reactive value.
                <code>get()</code> reads and tracks, <code>peek()</code> reads without tracking,
                <code>set()</code> updates and notifies.
            </div>
            <div className="demo-row">
                <div className="demo-value large highlight">{value}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="demo-row">
                        <button className="demo-btn" onClick={() => counter.set(counter.peek() - 1)}>− 1</button>
                        <button className="demo-btn primary" onClick={() => counter.set(counter.peek() + 1)}>+ 1</button>
                        <button className="demo-btn" onClick={() => counter.set(counter.peek() + 10)}>+ 10</button>
                    </div>
                    <div className="demo-row">
                        <button className="demo-btn danger" onClick={() => counter.set(0)}>Reset</button>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                            peek() = {counter.peek()} (no re-render from this read)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  2. Computed — lazy derived values
// ═══════════════════════════════════════════════════════════════

const price = createSignal(49.99);
const quantity = createSignal(1);
const taxRate = createSignal(0.08);

let computeRuns = 0;
const subtotal = createComputed(() => { computeRuns++; return price.get() * quantity.get(); });
const tax = createComputed(() => subtotal.get() * taxRate.get());
const total = createComputed(() => subtotal.get() + tax.get());

function ComputedDemo() {
    const p = useSignalValue(price);
    const q = useSignalValue(quantity);
    const sub = useSignalValue(subtotal);
    const t = useSignalValue(tax);
    const tot = useSignalValue(total);

    return (
        <div className="demo-section">
            <div className="demo-header">
                <div className="demo-number">2</div>
                <div className="demo-title">Computed</div>
            </div>
            <div className="demo-desc">
                <code>createComputed(fn)</code> creates a lazy derived value. It only recomputes when dependencies change
                and you read it. Computed values chain — <code>total</code> depends on <code>subtotal</code> which depends on <code>price × quantity</code>.
            </div>
            <div className="demo-grid">
                <div className="demo-stat">
                    <div className="demo-label">Price</div>
                    <div className="demo-value">${p.toFixed(2)}</div>
                    <div className="demo-row" style={{ marginTop: 6, justifyContent: "center" }}>
                        <button className="demo-btn" onClick={() => price.set(Math.max(0, price.peek() - 10))}>−10</button>
                        <button className="demo-btn" onClick={() => price.set(price.peek() + 10)}>+10</button>
                    </div>
                </div>
                <div className="demo-stat">
                    <div className="demo-label">Quantity</div>
                    <div className="demo-value">{q}</div>
                    <div className="demo-row" style={{ marginTop: 6, justifyContent: "center" }}>
                        <button className="demo-btn" onClick={() => quantity.set(Math.max(1, quantity.peek() - 1))}>−</button>
                        <button className="demo-btn" onClick={() => quantity.set(quantity.peek() + 1)}>+</button>
                    </div>
                </div>
                <div className="demo-stat">
                    <div className="demo-label">Subtotal</div>
                    <div className="demo-value highlight">${sub.toFixed(2)}</div>
                </div>
                <div className="demo-stat">
                    <div className="demo-label">Tax ({(taxRate.peek() * 100).toFixed(0)}%)</div>
                    <div className="demo-value warn">${t.toFixed(2)}</div>
                </div>
            </div>
            <div style={{ textAlign: "center" }}>
                <div className="demo-label" style={{ marginBottom: 4 }}>Total</div>
                <div className="demo-value large success">${tot.toFixed(2)}</div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  3. Effects + Dispose — reactive side-effects with cleanup
// ═══════════════════════════════════════════════════════════════

const effectSignal = createSignal(0);

function EffectDemo() {
    const [logs, setLogs] = useState<string[]>([]);
    const [disposed, setDisposed] = useState(false);
    const disposeRef = useRef<(() => void) | null>(null);
    const value = useSignalValue(effectSignal);

    const startEffect = useCallback(() => {
        setLogs(["Effect created — watching signal..."]);
        setDisposed(false);
        disposeRef.current?.();
        disposeRef.current = createEffect(() => {
            const v = effectSignal.get();
            setLogs((prev) => [...prev, `Effect ran → value is ${v}`]);
        });
    }, []);

    const disposeEffect = useCallback(() => {
        disposeRef.current?.();
        disposeRef.current = null;
        setDisposed(true);
        setLogs((prev) => [...prev, "✕ Effect disposed — no more reactions"]);
    }, []);

    return (
        <div className="demo-section">
            <div className="demo-header">
                <div className="demo-number">3</div>
                <div className="demo-title">Effects & Dispose</div>
            </div>
            <div className="demo-desc">
                <code>createEffect(fn)</code> runs immediately and re-runs when dependencies change.
                It returns a <code>dispose()</code> function to stop it. Try creating an effect, changing the value, then disposing.
            </div>
            <div className="demo-row" style={{ marginBottom: 12 }}>
                <div className="demo-value large">{value}</div>
                <button className="demo-btn" onClick={() => effectSignal.set(effectSignal.peek() + 1)}>+ 1</button>
                <button className="demo-btn" onClick={() => effectSignal.set(effectSignal.peek() + 5)}>+ 5</button>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button className="demo-btn primary" onClick={startEffect}>Create Effect</button>
                    <button className="demo-btn danger" onClick={disposeEffect} disabled={disposed}>Dispose</button>
                </div>
            </div>
            <div className="demo-log">
                {logs.length === 0
                    ? <div className="demo-log-empty">Click "Create Effect" to start...</div>
                    : logs.map((l, i) => (
                        <div key={i} className={i === logs.length - 1 ? "log-new" : ""}>{l}</div>
                    ))
                }
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  4. Dynamic Dependencies — auto-tracked per run
// ═══════════════════════════════════════════════════════════════

const showDetails = createSignal(true);
const userName = createSignal("Alice");
const userAge = createSignal(28);

function DynamicDepsDemo() {
    const show = useSignalValue(showDetails);
    const name = useSignalValue(userName);
    const age = useSignalValue(userAge);

    const displayRef = useText<string, HTMLDivElement>(() => {
        if (showDetails.get()) {
            return `${userName.get()}, age ${userAge.get()}`;
        }
        return userName.get();
    });

    return (
        <div className="demo-section">
            <div className="demo-header">
                <div className="demo-number">4</div>
                <div className="demo-title">Dynamic Dependencies</div>
            </div>
            <div className="demo-desc">
                Dependencies are re-tracked on every run. When "Show age" is off, changing age doesn't trigger updates.
                The display below uses <code>useText</code> — it writes to the DOM directly, zero React re-renders.
            </div>
            <div className="demo-row" style={{ marginBottom: 12 }}>
                <div className="demo-value highlight" ref={displayRef} style={{ minWidth: 180 }} />
                <button
                    className={`demo-btn ${show ? "primary" : ""}`}
                    onClick={() => showDetails.set(!showDetails.peek())}
                >
                    {show ? "Hide age" : "Show age"}
                </button>
            </div>
            <div className="demo-row">
                <div className="demo-label" style={{ width: 50 }}>Name</div>
                {["Alice", "Bob", "Charlie"].map((n) => (
                    <button key={n} className={`demo-btn ${name === n ? "primary" : ""}`} onClick={() => userName.set(n)}>
                        {n}
                    </button>
                ))}
                <div style={{ width: 16 }} />
                <div className="demo-label" style={{ width: 30 }}>Age</div>
                <button className="demo-btn" onClick={() => userAge.set(Math.max(0, userAge.peek() - 1))}>−</button>
                <div className="demo-value">{age}</div>
                <button className="demo-btn" onClick={() => userAge.set(userAge.peek() + 1)}>+</button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  5. Batch — group updates, effects run once
// ═══════════════════════════════════════════════════════════════

const batchA = createSignal(1);
const batchB = createSignal(1);
const batchSum = createComputed(() => batchA.get() + batchB.get());

function BatchDemo() {
    const [logs, setLogs] = useState<string[]>([]);
    const a = useSignalValue(batchA);
    const b = useSignalValue(batchB);
    const sum = useSignalValue(batchSum);

    const unbatchedUpdate = useCallback(() => {
        const newLogs: string[] = [];
        const dispose = createEffect(() => {
            newLogs.push(`Effect → ${batchA.get()} + ${batchB.get()} = ${batchSum.get()}`);
        });
        batchA.set(batchA.peek() + 1);
        batchB.set(batchB.peek() + 1);
        // Wait for microtask to flush
        queueMicrotask(() => {
            dispose();
            setLogs(newLogs);
        });
    }, []);

    const batchedUpdate = useCallback(() => {
        const newLogs: string[] = [];
        const dispose = createEffect(() => {
            newLogs.push(`Effect → ${batchA.get()} + ${batchB.get()} = ${batchSum.get()}`);
        });
        batch(() => {
            batchA.set(batchA.peek() + 1);
            batchB.set(batchB.peek() + 1);
        });
        dispose();
        setLogs(newLogs);
    }, []);

    return (
        <div className="demo-section">
            <div className="demo-header">
                <div className="demo-number">5</div>
                <div className="demo-title">Batch</div>
            </div>
            <div className="demo-desc">
                <code>batch(fn)</code> defers all effect runs until the batch completes.
                Without batch, updating A then B triggers the effect twice. With batch, it runs once with final values.
            </div>
            <div className="demo-grid">
                <div className="demo-stat">
                    <div className="demo-label">A</div>
                    <div className="demo-value">{a}</div>
                </div>
                <div className="demo-stat">
                    <div className="demo-label">B</div>
                    <div className="demo-value">{b}</div>
                </div>
                <div className="demo-stat">
                    <div className="demo-label">A + B</div>
                    <div className="demo-value highlight">{sum}</div>
                </div>
            </div>
            <div className="demo-row">
                <button className="demo-btn" onClick={unbatchedUpdate}>Update A, B (no batch)</button>
                <button className="demo-btn primary" onClick={batchedUpdate}>Update A, B (batched)</button>
                <button className="demo-btn danger" onClick={() => { batchA.set(1); batchB.set(1); setLogs([]); }}>Reset</button>
            </div>
            <div className="demo-log">
                {logs.length === 0
                    ? <div className="demo-log-empty">Click an update button to see effect runs...</div>
                    : <>
                        <div><span className="log-label">Effect ran {logs.length} time{logs.length > 1 ? "s" : ""}:</span></div>
                        {logs.map((l, i) => <div key={i} className={i === logs.length - 1 ? "log-new" : ""}>{l}</div>)}
                    </>
                }
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  6. Glitch-free — no intermediate states
// ═══════════════════════════════════════════════════════════════

const gA = createSignal(1);
const gB = createSignal(1);
const gSum = createComputed(() => gA.get() + gB.get());
const gLabel = createComputed(() => `${gA.get()} + ${gB.get()} = ${gSum.get()}`);

function GlitchFreeDemo() {
    const [history, setHistory] = useState<string[]>([]);
    const disposeRef = useRef<(() => void) | null>(null);

    React.useEffect(() => {
        disposeRef.current = createEffect(() => {
            const text = gLabel.get();
            setHistory((prev) => [...prev, text]);
        });
        return () => disposeRef.current?.();
    }, []);

    const update = useCallback(() => {
        batch(() => {
            gA.set(gA.peek() + 1);
            gB.set(gB.peek() + 1);
        });
    }, []);

    const reset = useCallback(() => {
        batch(() => { gA.set(1); gB.set(1); });
        setHistory([]);
        // Re-run to capture initial
        queueMicrotask(() => setHistory(["1 + 1 = 2"]));
    }, []);

    const labelRef = useText<string, HTMLDivElement>(() => gLabel.get());

    return (
        <div className="demo-section">
            <div className="demo-header">
                <div className="demo-number">6</div>
                <div className="demo-title">Glitch-free Propagation</div>
            </div>
            <div className="demo-desc">
                When A and B both change in a batch, the effect sees <strong>only the final consistent state</strong>.
                You'll never see an intermediate value like "2 + 1 = 3" — computed values are always consistent.
            </div>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div className="demo-label" style={{ marginBottom: 4 }}>Current</div>
                <div className="demo-value large success" ref={labelRef} style={{ display: "inline-flex" }} />
            </div>
            <div className="demo-row" style={{ justifyContent: "center", marginBottom: 12 }}>
                <button className="demo-btn primary" onClick={update}>Increment A & B (batched)</button>
                <button className="demo-btn danger" onClick={reset}>Reset</button>
            </div>
            <div className="demo-log">
                <div><span className="log-label">Effect history (should never show inconsistent values):</span></div>
                {history.map((h, i) => (
                    <div key={i} className={i === history.length - 1 ? "log-new" : ""}>{h}</div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  Main
// ═══════════════════════════════════════════════════════════════

export default function Playground() {
    return (
        <div className="playground">
            <style>{css}</style>
            <h1><span>fineact</span> Playground</h1>
            <p className="subtitle">Interactive demo of every core API. Click around — everything is reactive.</p>
            <SignalDemo />
            <ComputedDemo />
            <EffectDemo />
            <DynamicDepsDemo />
            <BatchDemo />
            <GlitchFreeDemo />
        </div>
    );
}
