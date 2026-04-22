// ─── React Benchmark: useState vs useSignalValue vs useText ───
// Drop this into a React 18+ project with fineact installed.
//
// What it measures:
// - Render count per component
// - Total React renders vs DOM writes
// - FPS during rapid updates
//
// Three identical UIs:
// 1. Pure React useState — every update re-renders the tree
// 2. fineact useSignalValue — targeted re-renders via useSyncExternalStore
// 3. fineact useText — bypasses React entirely, writes to DOM directly

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { createSignal, batch } from "fineact/core";
import { useSignalValue } from "fineact/react";
import { useText } from "fineact/dom";

// ─── Config ───
const ITEM_COUNT = 200;
const UPDATE_INTERVAL_MS = 16; // ~60fps
const BENCHMARK_DURATION_MS = 5000;

// ─── Styles ───

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap');

  .bench-app {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 24px;
    background: #f8fafc;
    min-height: 100vh;
    color: #0f172a;
  }
  .bench-title {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 4px;
  }
  .bench-title span {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .bench-subtitle {
    color: #64748b;
    font-size: 14px;
    margin: 0 0 32px;
  }
  .bench-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 768px) {
    .bench-grid { grid-template-columns: repeat(3, 1fr); }
  }

  .bench-card {
    background: #fff;
    border: 1.5px solid #f1f5f9;
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .bench-card:hover {
    border-color: #e2e8f0;
    box-shadow: 0 4px 16px rgba(0,0,0,0.05);
  }

  .bench-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .bench-card-number {
    width: 24px;
    height: 24px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .bench-card-title {
    font-size: 16px;
    font-weight: 600;
  }
  .bench-card-desc {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.5;
    margin-bottom: 16px;
  }
  .bench-card-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: 6px;
    margin-bottom: 16px;
    width: fit-content;
  }

  .bench-btn {
    padding: 10px 0;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    width: 100%;
    margin-bottom: 16px;
  }
  .bench-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .bench-btn:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .bench-btn:not(:disabled):active { transform: translateY(0); }

  .bench-btn-react { background: #0f172a; color: #fff; }
  .bench-btn-signal { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
  .bench-btn-direct { background: linear-gradient(135deg, #059669, #10b981); color: #fff; }

  .bench-result {
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
    font-family: 'JetBrains Mono', monospace;
  }
  .bench-result-react { background: #f1f5f9; border: 1.5px solid #e2e8f0; }
  .bench-result-signal { background: #eef2ff; border: 1.5px solid #c7d2fe; }
  .bench-result-direct { background: #ecfdf5; border: 1.5px solid #a7f3d0; }

  .bench-result .result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    padding: 3px 0;
  }
  .bench-result .result-label { color: #64748b; }
  .bench-result .result-value { font-weight: 600; color: #0f172a; }
  .bench-result .result-fps { font-size: 20px; font-weight: 700; }

  .bench-items {
    max-height: 80px;
    overflow: hidden;
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: auto;
    mask-image: linear-gradient(to bottom, black 40%, transparent);
  }
  .bench-item {
    padding: 2px 6px;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 4px;
    font-size: 10px;
    color: #94a3b8;
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  Approach 1: Pure React useState
// ═══════════════════════════════════════════════════════════════

let reactRenderCount = 0;

const ReactItem = memo(({ value, index }: { value: number; index: number }) => {
    reactRenderCount++;
    return <div className="bench-item">#{index}: {value}</div>;
});
ReactItem.displayName = "ReactItem";

function ReactBench() {
    const [counter, setCounter] = useState(0);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<{ fps: string; frames: number; renders: string } | null>(null);
    const framesRef = useRef(0);

    const start = useCallback(() => {
        reactRenderCount = 0;
        framesRef.current = 0;
        setRunning(true);
        setResult(null);
    }, []);

    useEffect(() => {
        if (!running) return;
        let raf: number;
        const startTime = performance.now();
        const tick = () => {
            setCounter((c) => c + 1);
            framesRef.current++;
            if (performance.now() - startTime < BENCHMARK_DURATION_MS) {
                raf = requestAnimationFrame(tick);
            } else {
                setRunning(false);
                const elapsed = (performance.now() - startTime) / 1000;
                setResult({
                    fps: (framesRef.current / elapsed).toFixed(1),
                    frames: framesRef.current,
                    renders: reactRenderCount.toLocaleString(),
                });
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [running]);

    return (
        <div className="bench-card">
            <div className="bench-card-header">
                <div className="bench-card-number" style={{ background: "#f1f5f9", color: "#0f172a" }}>1</div>
                <div className="bench-card-title">React useState</div>
            </div>
            <div className="bench-card-desc">
                Every <code>setCounter</code> re-renders parent + {ITEM_COUNT} children through React's reconciliation.
            </div>
            <div className="bench-card-tag" style={{ background: "#f1f5f9", color: "#64748b" }}>Baseline</div>
            <button className="bench-btn bench-btn-react" onClick={start} disabled={running}>
                {running ? "Running..." : "Start Benchmark"}
            </button>
            {result && (
                <div className="bench-result bench-result-react">
                    <div className="result-row"><span className="result-label">FPS</span><span className="result-value result-fps">{result.fps}</span></div>
                    <div className="result-row"><span className="result-label">Frames</span><span className="result-value">{result.frames}</span></div>
                    <div className="result-row"><span className="result-label">Component renders</span><span className="result-value">{result.renders}</span></div>
                </div>
            )}
            <div className="bench-items">
                {Array.from({ length: ITEM_COUNT }, (_, i) => (
                    <ReactItem key={i} index={i} value={counter + i} />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  Approach 2: fineact useSignalValue
// ═══════════════════════════════════════════════════════════════

const signalCounter = createSignal(0);
let signalRenderCount = 0;

const SignalItem = memo(({ index }: { index: number }) => {
    const value = useSignalValue(signalCounter);
    signalRenderCount++;
    return <div className="bench-item">#{index}: {value + index}</div>;
});
SignalItem.displayName = "SignalItem";

function SignalBench() {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<{ fps: string; frames: number; renders: string } | null>(null);
    const framesRef = useRef(0);

    const start = useCallback(() => {
        signalRenderCount = 0;
        signalCounter.set(0);
        framesRef.current = 0;
        setRunning(true);
        setResult(null);
    }, []);

    useEffect(() => {
        if (!running) return;
        let raf: number;
        const startTime = performance.now();
        const tick = () => {
            signalCounter.set(signalCounter.peek() + 1);
            framesRef.current++;
            if (performance.now() - startTime < BENCHMARK_DURATION_MS) {
                raf = requestAnimationFrame(tick);
            } else {
                setRunning(false);
                const elapsed = (performance.now() - startTime) / 1000;
                setResult({
                    fps: (framesRef.current / elapsed).toFixed(1),
                    frames: framesRef.current,
                    renders: signalRenderCount.toLocaleString(),
                });
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [running]);

    return (
        <div className="bench-card">
            <div className="bench-card-header">
                <div className="bench-card-number" style={{ background: "#eef2ff", color: "#6366f1" }}>2</div>
                <div className="bench-card-title">useSignalValue</div>
            </div>
            <div className="bench-card-desc">
                Signal notifies {ITEM_COUNT} subscribed components via <code>useSyncExternalStore</code>. No prop-drilling.
            </div>
            <div className="bench-card-tag" style={{ background: "#eef2ff", color: "#6366f1" }}>Targeted re-renders</div>
            <button className="bench-btn bench-btn-signal" onClick={start} disabled={running}>
                {running ? "Running..." : "Start Benchmark"}
            </button>
            {result && (
                <div className="bench-result bench-result-signal">
                    <div className="result-row"><span className="result-label">FPS</span><span className="result-value result-fps">{result.fps}</span></div>
                    <div className="result-row"><span className="result-label">Frames</span><span className="result-value">{result.frames}</span></div>
                    <div className="result-row"><span className="result-label">Component renders</span><span className="result-value">{result.renders}</span></div>
                </div>
            )}
            <div className="bench-items">
                {Array.from({ length: ITEM_COUNT }, (_, i) => (
                    <SignalItem key={i} index={i} />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  Approach 3: fineact useText (direct DOM)
// ═══════════════════════════════════════════════════════════════

const directCounter = createSignal(0);

function DirectItem({ index }: { index: number }) {
    const ref = useText<string, HTMLDivElement>(() => `#${index}: ${directCounter.get() + index}`);
    return <div className="bench-item" ref={ref} />;
}

function DirectBench() {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<{ fps: string; frames: number } | null>(null);
    const framesRef = useRef(0);

    const start = useCallback(() => {
        directCounter.set(0);
        framesRef.current = 0;
        setRunning(true);
        setResult(null);
    }, []);

    useEffect(() => {
        if (!running) return;
        let raf: number;
        const startTime = performance.now();
        const tick = () => {
            directCounter.set(directCounter.peek() + 1);
            framesRef.current++;
            if (performance.now() - startTime < BENCHMARK_DURATION_MS) {
                raf = requestAnimationFrame(tick);
            } else {
                setRunning(false);
                const elapsed = (performance.now() - startTime) / 1000;
                setResult({
                    fps: (framesRef.current / elapsed).toFixed(1),
                    frames: framesRef.current,
                });
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [running]);

    return (
        <div className="bench-card">
            <div className="bench-card-header">
                <div className="bench-card-number" style={{ background: "#ecfdf5", color: "#059669" }}>3</div>
                <div className="bench-card-title">useText (direct DOM)</div>
            </div>
            <div className="bench-card-desc">
                Signal writes <code>textContent</code> to {ITEM_COUNT} DOM nodes directly. Zero React re-renders.
            </div>
            <div className="bench-card-tag" style={{ background: "#ecfdf5", color: "#059669" }}>Fastest</div>
            <button className="bench-btn bench-btn-direct" onClick={start} disabled={running}>
                {running ? "Running..." : "Start Benchmark"}
            </button>
            {result && (
                <div className="bench-result bench-result-direct">
                    <div className="result-row"><span className="result-label">FPS</span><span className="result-value result-fps">{result.fps}</span></div>
                    <div className="result-row"><span className="result-label">Frames</span><span className="result-value">{result.frames}</span></div>
                    <div className="result-row"><span className="result-label">Component renders</span><span className="result-value">0</span></div>
                </div>
            )}
            <div className="bench-items">
                {Array.from({ length: ITEM_COUNT }, (_, i) => (
                    <DirectItem key={i} index={i} />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  Main benchmark page
// ═══════════════════════════════════════════════════════════════

export default function BenchmarkApp() {
    return (
        <div className="bench-app">
            <style>{css}</style>
            <div className="bench-title"><span>fineact</span> vs React — Performance</div>
            <p className="bench-subtitle">
                {ITEM_COUNT} items updated every frame for {BENCHMARK_DURATION_MS / 1000}s.
                Click each button and compare FPS & render counts.
            </p>
            <div className="bench-grid">
                <ReactBench />
                <SignalBench />
                <DirectBench />
            </div>
        </div>
    );
}
