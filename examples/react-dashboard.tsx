// ─── React: Dashboard with live data ───
// Copy into a React 18+ project with fineact installed.

import React from "react";
import { createSignal, createComputed, batch } from "fineact/core";
import { useSignalValue, useComputed } from "fineact/react";
import { useText } from "fineact/dom";

// ─── Store: simulates a live metrics dashboard ───

type Metrics = {
    activeUsers: number;
    requestsPerSec: number;
    errorRate: number;
    avgResponseMs: number;
    cpuUsage: number;
    memoryUsage: number;
};

const metrics = createSignal<Metrics>({
    activeUsers: 0,
    requestsPerSec: 0,
    errorRate: 0,
    avgResponseMs: 0,
    cpuUsage: 0,
    memoryUsage: 0,
});

const selectedTimeRange = createSignal<"1h" | "24h" | "7d">("1h");

const healthStatus = createComputed(() => {
    const m = metrics.get();
    if (m.errorRate > 5) return "critical";
    if (m.errorRate > 2 || m.avgResponseMs > 500) return "warning";
    return "healthy";
});

const statusColor = createComputed(() => {
    const s = healthStatus.get();
    if (s === "critical") return "#ef4444";
    if (s === "warning") return "#f59e0b";
    return "#22c55e";
});

const statusBg = createComputed(() => {
    const s = healthStatus.get();
    if (s === "critical") return "#fef2f2";
    if (s === "warning") return "#fffbeb";
    return "#f0fdf4";
});

// Simulates a WebSocket / SSE pushing metrics
function startMetricsStream() {
    return setInterval(() => {
        batch(() => {
            metrics.set({
                activeUsers: 100 + Math.floor(Math.random() * 900),
                requestsPerSec: 500 + Math.floor(Math.random() * 2000),
                errorRate: Math.random() * 8,
                avgResponseMs: 50 + Math.random() * 600,
                cpuUsage: 10 + Math.random() * 80,
                memoryUsage: 30 + Math.random() * 60,
            });
        });
    }, 1000);
}

// ─── Styles ───

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .dashboard {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 24px;
    background: #f8fafc;
    min-height: 100vh;
    color: #0f172a;
  }
  .dash-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
  }
  .dash-header h1 {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #0f172a;
  }
  .dash-header h1 span { font-size: 20px; }
  .dash-subtitle {
    font-size: 13px;
    color: #64748b;
    margin: 2px 0 0;
  }

  .health-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .health-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .time-selector {
    display: flex;
    gap: 4px;
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 3px;
    margin-bottom: 20px;
    width: fit-content;
  }
  .time-selector button {
    padding: 6px 16px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .time-selector button:hover { color: #0f172a; }
  .time-selector button[data-active="true"] {
    background: #0f172a;
    color: #fff;
  }

  .alert-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    background: linear-gradient(135deg, #fef2f2, #fff1f2);
    border: 1.5px solid #fecaca;
    border-radius: 12px;
    margin-bottom: 20px;
    font-size: 14px;
    font-weight: 500;
    color: #dc2626;
  }
  .alert-banner .alert-icon { font-size: 18px; }
  .alert-banner .alert-value { font-weight: 700; }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .metric-card {
    background: #fff;
    border: 1.5px solid #f1f5f9;
    border-radius: 16px;
    padding: 20px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .metric-card:hover {
    border-color: #e2e8f0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  }
  .metric-label {
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .metric-value {
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
  }
  .metric-icon {
    font-size: 14px;
    margin-right: 4px;
  }

  .progress-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .progress-card {
    background: #fff;
    border: 1.5px solid #f1f5f9;
    border-radius: 16px;
    padding: 20px;
  }
  .progress-card .metric-label { margin-bottom: 12px; }
  .progress-bar-track {
    height: 8px;
    background: #f1f5f9;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .progress-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;
  }
  .progress-value {
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .dash-footer {
    margin-top: 24px;
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
  }
  .dash-footer code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
`;

// ─── Components ───

function MetricCard({ icon, label, getValue, color }: {
    icon: string;
    label: string;
    getValue: () => string;
    color?: string;
}) {
    const ref = useText<string, HTMLDivElement>(getValue);
    return (
        <div className="metric-card">
            <div className="metric-label"><span className="metric-icon">{icon}</span>{label}</div>
            <div className="metric-value" ref={ref} style={color ? { color } : undefined} />
        </div>
    );
}

function ProgressCard({ icon, label, getValue, getPercent, color }: {
    icon: string;
    label: string;
    getValue: () => string;
    getPercent: () => number;
    color: string;
}) {
    const valueRef = useText<string, HTMLSpanElement>(getValue);
    const barRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const interval = setInterval(() => {
            if (barRef.current) {
                barRef.current.style.width = `${Math.min(100, getPercent())}%`;
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="progress-card">
            <div className="metric-label"><span className="metric-icon">{icon}</span>{label}</div>
            <div className="progress-bar-track">
                <div ref={barRef} className="progress-bar-fill" style={{ background: color, width: "0%" }} />
            </div>
            <span className="progress-value" ref={valueRef} style={{ color }} />
        </div>
    );
}

function HealthBadge() {
    const status = useSignalValue(healthStatus);
    const color = useSignalValue(statusColor);
    const bg = useSignalValue(statusBg);
    return (
        <span className="health-badge" style={{ background: bg, color }}>
            <span className="health-dot" style={{ background: color }} />
            {status}
        </span>
    );
}

function TimeRangeSelector() {
    const range = useSignalValue(selectedTimeRange);
    return (
        <div className="time-selector">
            {(["1h", "24h", "7d"] as const).map((r) => (
                <button
                    key={r}
                    data-active={range === r}
                    onClick={() => selectedTimeRange.set(r)}
                >
                    {r}
                </button>
            ))}
        </div>
    );
}

function AlertBanner() {
    const errorRate = useComputed(() => metrics.get().errorRate);
    if (errorRate <= 5) return null;
    return (
        <div className="alert-banner">
            <span className="alert-icon">🚨</span>
            High error rate: <span className="alert-value">{errorRate.toFixed(1)}%</span> — investigate immediately
        </div>
    );
}

export default function Dashboard() {
    React.useEffect(() => {
        const interval = startMetricsStream();
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard">
            <style>{css}</style>
            <div className="dash-header">
                <div>
                    <h1><span>📊</span> System Dashboard</h1>
                    <p className="dash-subtitle">Real-time metrics · Auto-refresh every 1s</p>
                </div>
                <HealthBadge />
            </div>
            <TimeRangeSelector />
            <AlertBanner />
            <div className="metrics-grid">
                <MetricCard
                    icon="👥"
                    label="Active Users"
                    getValue={() => metrics.get().activeUsers.toLocaleString()}
                />
                <MetricCard
                    icon="⚡"
                    label="Requests / sec"
                    getValue={() => metrics.get().requestsPerSec.toLocaleString()}
                />
                <MetricCard
                    icon="⚠️"
                    label="Error Rate"
                    getValue={() => `${metrics.get().errorRate.toFixed(1)}%`}
                    color="#ef4444"
                />
                <MetricCard
                    icon="🕐"
                    label="Avg Response"
                    getValue={() => `${metrics.get().avgResponseMs.toFixed(0)}ms`}
                />
            </div>
            <div className="progress-section">
                <ProgressCard
                    icon="🖥️"
                    label="CPU Usage"
                    getValue={() => `${metrics.get().cpuUsage.toFixed(1)}%`}
                    getPercent={() => metrics.peek().cpuUsage}
                    color="#6366f1"
                />
                <ProgressCard
                    icon="💾"
                    label="Memory Usage"
                    getValue={() => `${metrics.get().memoryUsage.toFixed(1)}%`}
                    getPercent={() => metrics.peek().memoryUsage}
                    color="#8b5cf6"
                />
            </div>
            <div className="dash-footer">
                Metric values update via <code>useText</code> — zero React re-renders
            </div>
        </div>
    );
}
