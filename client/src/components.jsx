import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getUser } from "./api.js";

export const today = () => new Date().toISOString().slice(0, 10);

// Flash message hook: const [msg, run] = useFlash(); run(promise)
export function useFlash() {
  const [msg, setMsg] = useState(null);
  const run = useCallback(async (fn, reload) => {
    try { const r = await fn(); setMsg({ type: "success", text: r?.message || "Done" }); reload && (await reload()); }
    catch (e) { setMsg({ type: "error", text: e.message }); }
  }, []);
  // load(fn): silent data loading that only shows errors
  const load = useCallback(async (fn) => { try { await fn(); } catch (e) { setMsg({ type: "error", text: e.message }); } }, []);
  return [msg, run, load];
}

// Dashboard shell with top bar + tab navigation
export function Layout({ title, tabs, tab, setTab, msg, children }) {
  const nav = useNavigate();
  const user = getUser();
  return (
    <div>
      <header className="topbar">
        <h1>{title}</h1>
        <div>{user?.name} <button className="btn ghost" onClick={() => { clearSession(); nav("/login"); }}>Logout</button></div>
      </header>
      <nav className="tabs">
        {tabs.map((t) => <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      <main>
        {msg && <div className={"flash " + msg.type}>{msg.text}</div>}
        {children}
      </main>
    </div>
  );
}

// Generic form. fields: [{name,label,type,options:[[value,label]],required}]
export function Form({ fields, onSubmit, submit = "Save", initial = {}, onCancel }) {
  const blank = Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.options ? f.options[0]?.[0] ?? "" : "")]));
  const [v, setV] = useState(blank);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSubmit(v); if (!Object.keys(initial).length) setV(blank); }}>
      {fields.map((f) => (
        <label key={f.name}>{f.label}
          {f.options ? (
            <select value={v[f.name]} onChange={set(f.name)} required={f.required}>
              {f.options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
            </select>
          ) : f.type === "textarea" ? (
            <textarea value={v[f.name]} onChange={set(f.name)} required={f.required} rows={2} />
          ) : (
            <input type={f.type || "text"} value={v[f.name]} onChange={set(f.name)} required={f.required} min={f.min} max={f.max} />
          )}
        </label>
      ))}
      <div className="row"><button className="btn">{submit}</button>{onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}</div>
    </form>
  );
}

export const Card = ({ title, children }) => <section className="card">{title && <h2>{title}</h2>}{children}</section>;

export const Table = ({ head, rows, empty = "Nothing to show yet." }) => (
  <div className="scroll">
    <table>
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)
          : <tr><td colSpan={head.length} className="muted">{empty}</td></tr>}
      </tbody>
    </table>
  </div>
);

export const Badge = ({ s }) => <span className={"badge " + String(s).toLowerCase()}>{s}</span>;
export const Bar = ({ label, value, max }) => (
  <div className="bar"><span>{label}</span><div><i style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div><b>{value}</b></div>
);

export const Stat = ({ label, value, onClick }) => <div className="stat" onClick={onClick} style={onClick ? { cursor: "pointer" } : null}><b>{value ?? "-"}</b><span>{label}</span></div>;
export const Stars = ({ n }) => <span className="stars">{"★".repeat(n || 0)}{"☆".repeat(5 - (n || 0))}</span>;
export const fmt = (a) => `${a.date} ${a.start}${a.end ? "-" + a.end : ""}`;
