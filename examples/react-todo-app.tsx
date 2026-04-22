// ─── React: Todo App with fineact signals ───
// Copy into a React 18+ project with fineact installed.

import React from "react";
import { createSignal, createComputed, batch } from "fineact/core";
import { useSignalValue, useComputed } from "fineact/react";
import { bindText } from "fineact/dom";

// ─── Store ───

type Todo = { id: number; text: string; done: boolean };

const todos = createSignal<Todo[]>([]);
const filter = createSignal<"all" | "active" | "done">("all");
let nextId = 1;

const visibleTodos = createComputed(() => {
    const list = todos.get();
    const f = filter.get();
    if (f === "active") return list.filter((t) => !t.done);
    if (f === "done") return list.filter((t) => t.done);
    return list;
});

const stats = createComputed(() => {
    const list = todos.get();
    return {
        total: list.length,
        active: list.filter((t) => !t.done).length,
        done: list.filter((t) => t.done).length,
    };
});

// ─── Actions ───

function addTodo(text: string) {
    todos.set([...todos.peek(), { id: nextId++, text, done: false }]);
}

function toggleTodo(id: number) {
    todos.set(todos.peek().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
}

function removeTodo(id: number) {
    todos.set(todos.peek().filter((t) => t.id !== id));
}

function clearDone() {
    todos.set(todos.peek().filter((t) => !t.done));
}

// ─── Styles ───

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .todo-app {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    max-width: 520px;
    margin: 60px auto;
    padding: 0 20px;
    color: #1a1a2e;
  }
  .todo-header {
    text-align: center;
    margin-bottom: 32px;
  }
  .todo-header h1 {
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 4px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .todo-header p {
    color: #94a3b8;
    font-size: 14px;
    margin: 0;
  }
  .todo-input-form {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }
  .todo-input-form input {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 15px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
    background: #f8fafc;
    color: #1a1a2e;
  }
  .todo-input-form input:focus {
    border-color: #6366f1;
    background: #fff;
  }
  .todo-input-form input::placeholder {
    color: #94a3b8;
  }
  .todo-input-form button {
    padding: 12px 24px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.2s;
  }
  .todo-input-form button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }
  .todo-input-form button:active { transform: translateY(0); }

  .todo-filters {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
  }
  .todo-filters button {
    padding: 6px 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 20px;
    background: #fff;
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .todo-filters button:hover { border-color: #6366f1; color: #6366f1; }
  .todo-filters button[data-active="true"] {
    background: #6366f1;
    border-color: #6366f1;
    color: #fff;
  }

  .todo-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .todo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: #fff;
    border: 1.5px solid #f1f5f9;
    border-radius: 12px;
    margin-bottom: 8px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .todo-item:hover {
    border-color: #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .todo-item input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: #6366f1;
    cursor: pointer;
    flex-shrink: 0;
  }
  .todo-item .todo-text {
    flex: 1;
    font-size: 15px;
    transition: all 0.2s;
  }
  .todo-item .todo-text.done {
    text-decoration: line-through;
    color: #94a3b8;
  }
  .todo-item .todo-delete {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #cbd5e1;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  .todo-item .todo-delete:hover {
    background: #fef2f2;
    color: #ef4444;
  }

  .todo-empty {
    text-align: center;
    padding: 40px 0;
    color: #94a3b8;
    font-size: 14px;
  }

  .todo-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-top: 1.5px solid #f1f5f9;
    margin-top: 8px;
  }
  .todo-footer .todo-count {
    font-size: 13px;
    color: #64748b;
  }
  .todo-footer .todo-count strong {
    color: #6366f1;
    font-weight: 600;
  }
  .todo-footer .todo-clear {
    padding: 6px 14px;
    border: 1.5px solid #fecaca;
    border-radius: 8px;
    background: #fff;
    color: #ef4444;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .todo-footer .todo-clear:hover {
    background: #fef2f2;
  }
`;

// ─── Components ───

function TodoInput() {
    const [text, setText] = React.useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            addTodo(text.trim());
            setText("");
        }
    };

    return (
        <form className="todo-input-form" onSubmit={handleSubmit}>
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What needs to be done?"
            />
            <button type="submit">Add</button>
        </form>
    );
}

function TodoItem({ todo }: { todo: Todo }) {
    return (
        <li className="todo-item">
            <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
            />
            <span className={`todo-text ${todo.done ? "done" : ""}`}>{todo.text}</span>
            <button className="todo-delete" onClick={() => removeTodo(todo.id)}>✕</button>
        </li>
    );
}

function TodoList() {
    const items = useSignalValue(visibleTodos);

    if (items.length === 0) {
        return <div className="todo-empty">No todos yet. Add one above!</div>;
    }

    return (
        <ul className="todo-list">
            {items.map((todo) => (
                <TodoItem key={todo.id} todo={todo} />
            ))}
        </ul>
    );
}

function Filters() {
    const current = useSignalValue(filter);
    return (
        <div className="todo-filters">
            {(["all", "active", "done"] as const).map((f) => (
                <button
                    key={f}
                    data-active={current === f}
                    onClick={() => filter.set(f)}
                >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
            ))}
        </div>
    );
}

function StatusBar() {
    const s = useSignalValue(stats);

    return (
        <div className="todo-footer">
            <div className="todo-count">
                <strong ref={bindText(() => String(stats.get().active))} /> remaining
                {" · "}
                <span ref={bindText(() => String(stats.get().done))} /> completed
            </div>
            {s.done > 0 && (
                <button className="todo-clear" onClick={clearDone}>
                    Clear completed
                </button>
            )}
        </div>
    );
}

export default function TodoApp() {
    return (
        <div className="todo-app">
            <style>{css}</style>
            <div className="todo-header">
                <h1>Todos</h1>
                <p>Powered by fineact signals</p>
            </div>
            <TodoInput />
            <Filters />
            <TodoList />
            <StatusBar />
        </div>
    );
}
