"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import {
  Plus, Trash2, Pencil, Check, X, Download, Upload,
  LayoutDashboard, Table, BarChart3, ChevronUp, ChevronDown, Search
} from "lucide-react";

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_COLUMNS = [
  { key: "task", label: "Task", type: "text" },
  { key: "assignee", label: "Assignee", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["To Do", "In Progress", "Done", "Overdue"] },
  { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"] },
  { key: "points", label: "Points", type: "number" },
  { key: "dueDate", label: "Due Date", type: "date" },
];

const DEFAULT_ROWS = [
  { id: 1, task: "Design homepage", assignee: "Alice", status: "Done", priority: "High", points: 5, dueDate: "2026-03-10" },
  { id: 2, task: "Build API endpoints", assignee: "Bob", status: "In Progress", priority: "High", points: 8, dueDate: "2026-03-15" },
  { id: 3, task: "Write unit tests", assignee: "Carol", status: "To Do", priority: "Medium", points: 3, dueDate: "2026-03-20" },
  { id: 4, task: "Setup CI/CD", assignee: "Dan", status: "Done", priority: "Medium", points: 5, dueDate: "2026-03-08" },
  { id: 5, task: "Fix login bug", assignee: "Alice", status: "Overdue", priority: "High", points: 2, dueDate: "2026-03-05" },
  { id: 6, task: "Create dashboard", assignee: "Eve", status: "In Progress", priority: "Low", points: 8, dueDate: "2026-03-22" },
  { id: 7, task: "Database migration", assignee: "Bob", status: "To Do", priority: "High", points: 13, dueDate: "2026-03-25" },
  { id: 8, task: "Update docs", assignee: "Carol", status: "Done", priority: "Low", points: 2, dueDate: "2026-03-12" },
];

// ── Colors ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = { Done: "#22c55e", "In Progress": "#3b82f6", "To Do": "#94a3b8", Overdue: "#ef4444" };
const PRIORITY_COLORS = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };
const CHART_PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#ec4899", "#14b8a6", "#8b5cf6"];

// ── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_KEY = "dashboard_data";

function loadFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveToStorage(data) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ── Small components ────────────────────────────────────────────────────────

const Pill = ({ color, children }) => (
  <span style={{ background: `${color}18`, color, borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
    {children}
  </span>
);

const Btn = ({ onClick, children, variant = "default", small, disabled, style: sx }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8,
    fontSize: small ? 12 : 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s", padding: small ? "4px 10px" : "8px 16px", opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    default: { background: "#f0f0f0", color: "#444" },
    primary: { background: "#6366f1", color: "#fff" },
    danger: { background: "#fef2f2", color: "#ef4444" },
    success: { background: "#f0fdf4", color: "#22c55e" },
    ghost: { background: "transparent", color: "#888" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...sx }}>{children}</button>;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "#333" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color || p.fill, display: "inline-block" }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    onClick={onClose}>
    <div onClick={e => e.stopPropagation()}
      style={{ background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111" }}>{title}</h3>
        <Btn onClick={onClose} variant="ghost" small><X size={16} /></Btn>
      </div>
      {children}
    </div>
  </div>
);

// ── Main ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [nextId, setNextId] = useState(DEFAULT_ROWS.length + 1);

  const [tab, setTab] = useState("dashboard");
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [showAddRow, setShowAddRow] = useState(false);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newRow, setNewRow] = useState({});
  const [newCol, setNewCol] = useState({ key: "", label: "", type: "text", options: "" });
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [filterCol, setFilterCol] = useState("all");
  const [filterVal, setFilterVal] = useState("");
  const [chartX, setChartX] = useState("status");
  const [chartMetric, setChartMetric] = useState("count");
  const [chartNumCol, setChartNumCol] = useState("points");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef();

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      if (saved.columns) setColumns(saved.columns);
      if (saved.rows) setRows(saved.rows);
      if (saved.nextId) setNextId(saved.nextId);
    }
    setLoaded(true);
  }, []);

  // ── Save to localStorage on every change ──
  useEffect(() => {
    if (!loaded) return;
    saveToStorage({ columns, rows, nextId });
  }, [columns, rows, nextId, loaded]);

  // ── Derived ──

  const textCols = columns.filter(c => c.type === "text" || c.type === "select");
  const numCols = columns.filter(c => c.type === "number");
  const selectCols = columns.filter(c => c.type === "select");

  const filteredRows = useMemo(() => {
    let r = [...rows];
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(row => columns.some(c => String(row[c.key] ?? "").toLowerCase().includes(s)));
    }
    if (filterCol !== "all" && filterVal) {
      r = r.filter(row => String(row[filterCol] ?? "").toLowerCase() === filterVal.toLowerCase());
    }
    if (sortField) {
      r.sort((a, b) => {
        const va = a[sortField] ?? "", vb = b[sortField] ?? "";
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return r;
  }, [rows, search, filterCol, filterVal, sortField, sortDir, columns]);

  // ── Row CRUD ──

  const addRow = () => {
    const row = { id: nextId };
    columns.forEach(c => { row[c.key] = newRow[c.key] ?? (c.type === "number" ? 0 : ""); });
    setRows(prev => [...prev, row]);
    setNextId(n => n + 1);
    setNewRow({});
    setShowAddRow(false);
  };

  const startEdit = (row) => { setEditingId(row.id); setEditRow({ ...row }); };
  const cancelEdit = () => { setEditingId(null); setEditRow({}); };
  const saveEdit = () => {
    setRows(prev => prev.map(r => r.id === editingId ? { ...editRow } : r));
    setEditingId(null); setEditRow({});
  };
  const deleteRow = (id) => { setRows(prev => prev.filter(r => r.id !== id)); setConfirmDelete(null); };

  // ── Column CRUD ──

  const addColumn = () => {
    const key = newCol.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || `col_${columns.length}`;
    const col = { key, label: newCol.label, type: newCol.type };
    if (newCol.type === "select" && newCol.options) col.options = newCol.options.split(",").map(o => o.trim()).filter(Boolean);
    setColumns(prev => [...prev, col]);
    setRows(prev => prev.map(r => ({ ...r, [key]: newCol.type === "number" ? 0 : "" })));
    setNewCol({ key: "", label: "", type: "text", options: "" });
    setShowAddCol(false);
  };

  const deleteColumn = (key) => {
    setColumns(prev => prev.filter(c => c.key !== key));
    setRows(prev => prev.map(r => { const copy = { ...r }; delete copy[key]; return copy; }));
  };

  // ── CSV ──

  const exportCSV = () => {
    const header = columns.map(c => c.label).join(",");
    const body = rows.map(r => columns.map(c => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "dashboard-data.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const newCols = headers.map(h => {
        const existing = columns.find(c => c.label.toLowerCase() === h.toLowerCase());
        return existing || { key: h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""), label: h, type: "text" };
      });
      const newRows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.trim().replace(/^"|"$/g, "")) || [];
        const row = { id: nextId + i - 1 };
        newCols.forEach((c, j) => {
          const v = vals[j] ?? "";
          row[c.key] = c.type === "number" ? (parseFloat(v) || 0) : v;
        });
        newRows.push(row);
      }
      setColumns(newCols);
      setRows(newRows);
      setNextId(nextId + newRows.length);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resetData = () => {
    setColumns(DEFAULT_COLUMNS);
    setRows(DEFAULT_ROWS);
    setNextId(DEFAULT_ROWS.length + 1);
  };

  // ── Chart data ──

  const chartData = useMemo(() => {
    const map = {};
    filteredRows.forEach(r => {
      const key = String(r[chartX] ?? "N/A");
      if (!map[key]) map[key] = { name: key, count: 0, sum: 0 };
      map[key].count++;
      if (chartNumCol && r[chartNumCol] !== undefined) map[key].sum += Number(r[chartNumCol]) || 0;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRows, chartX, chartNumCol]);

  const pieData = chartData.map((d, i) => ({ ...d, fill: CHART_PALETTE[i % CHART_PALETTE.length] }));

  const handleSort = (key) => {
    if (sortField === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(key); setSortDir("asc"); }
  };

  const uniqueVals = useMemo(() => {
    if (filterCol === "all") return [];
    return [...new Set(rows.map(r => String(r[filterCol] ?? "")))].filter(Boolean).sort();
  }, [rows, filterCol]);

  // ── Styles ──

  const inputStyle = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e0e0e0", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" };
  const selectStyle = { ...inputStyle, cursor: "pointer", background: "#fff" };
  const tabBtnStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8,
    border: "none", fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? "#111" : "transparent", color: active ? "#fff" : "#666",
    cursor: "pointer", transition: "all 0.2s",
  });

  const totalPoints = filteredRows.reduce((s, r) => s + (Number(r.points) || 0), 0);
  const doneCount = filteredRows.filter(r => r.status === "Done").length;
  const completionPct = filteredRows.length > 0 ? Math.round((doneCount / filteredRows.length) * 100) : 0;

  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#999" }}>Loading…</div>;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f8f8fa", minHeight: "100vh", padding: "20px 28px", color: "#333" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111" }}>My Dashboard</h1>
          <p style={{ fontSize: 12, color: "#bbb", margin: "2px 0 0" }}>Data auto-saves to your browser</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["dashboard", LayoutDashboard, "Dashboard"], ["data", Table, "Data"], ["charts", BarChart3, "Charts"]].map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)} style={tabBtnStyle(tab === key)}><Icon size={14} /> {label}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Rows", value: filteredRows.length, color: "#6366f1" },
          { label: "Done", value: doneCount, color: "#22c55e", sub: `${completionPct}%` },
          { label: "Total Points", value: totalPoints, color: "#8b5cf6" },
          { label: "Overdue", value: filteredRows.filter(r => r.status === "Overdue").length, color: "#ef4444" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}{k.sub ? <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 6 }}>{k.sub}</span> : null}</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 300 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "#aaa" }} />
          <input placeholder="Search all columns…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={filterCol} onChange={e => { setFilterCol(e.target.value); setFilterVal(""); }} style={{ ...selectStyle, width: "auto" }}>
          <option value="all">Filter by…</option>
          {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        {filterCol !== "all" && (
          <select value={filterVal} onChange={e => setFilterVal(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
            <option value="">All</option>
            {uniqueVals.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}
        <div style={{ flex: "1 1 0" }} />
        <Btn onClick={() => setShowAddRow(true)} variant="primary" small><Plus size={14} /> Add Row</Btn>
        <Btn onClick={() => setShowAddCol(true)} small><Plus size={14} /> Add Column</Btn>
        <Btn onClick={exportCSV} small><Download size={14} /> Export</Btn>
        <Btn onClick={() => fileRef.current?.click()} small><Upload size={14} /> Import</Btn>
        <Btn onClick={resetData} variant="danger" small>Reset</Btn>
        <input ref={fileRef} type="file" accept=".csv" onChange={importCSV} style={{ display: "none" }} />
      </div>

      {/* ══════════ DASHBOARD TAB ══════════ */}
      {tab === "dashboard" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {selectCols.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#333" }}>By {(columns.find(c => c.key === "status") || selectCols[0]).label}</h4>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={(() => {
                    const col = columns.find(c => c.key === "status") || selectCols[0];
                    const map = {};
                    filteredRows.forEach(r => { const k = r[col.key] ?? "N/A"; map[k] = (map[k] || 0) + 1; });
                    return Object.entries(map).map(([name, value], i) => ({ name, value, fill: STATUS_COLORS[name] || CHART_PALETTE[i % CHART_PALETTE.length] }));
                  })()} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                    {(() => {
                      const col = columns.find(c => c.key === "status") || selectCols[0];
                      const map = {};
                      filteredRows.forEach(r => { const k = r[col.key] ?? "N/A"; map[k] = (map[k] || 0) + 1; });
                      return Object.entries(map).map(([name], i) => <Cell key={i} fill={STATUS_COLORS[name] || CHART_PALETTE[i % CHART_PALETTE.length]} />);
                    })()}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: "#555", fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {textCols.length > 0 && numCols.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#333" }}>
                {numCols[0].label} by {(columns.find(c => c.key === "assignee") || textCols[0]).label}
              </h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(() => {
                  const groupCol = columns.find(c => c.key === "assignee") || textCols[0];
                  const valCol = numCols[0];
                  const map = {};
                  filteredRows.forEach(r => { const k = r[groupCol.key] ?? "N/A"; map[k] = (map[k] || 0) + (Number(r[valCol.key]) || 0); });
                  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
                })()} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} name={numCols[0].label} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {columns.find(c => c.key === "priority") && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#333" }}>By Priority</h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(() => {
                  const map = {};
                  filteredRows.forEach(r => { const k = r.priority ?? "N/A"; map[k] = (map[k] || 0) + 1; });
                  return Object.entries(map).map(([name, value]) => ({ name, value }));
                })()} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]}>
                    {(() => {
                      const map = {};
                      filteredRows.forEach(r => { const k = r.priority ?? "N/A"; map[k] = (map[k] || 0) + 1; });
                      return Object.entries(map).map(([name], i) => <Cell key={i} fill={PRIORITY_COLORS[name] || CHART_PALETTE[i]} />);
                    })()}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {textCols.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#333" }}>Completion Progress</h4>
              {(() => {
                const groupCol = textCols.find(c => c.key !== "assignee" && c.key !== "status" && c.key !== "priority") || textCols[0];
                const map = {};
                filteredRows.forEach(r => {
                  const k = r[groupCol.key] ?? "N/A";
                  if (!map[k]) map[k] = { total: 0, done: 0 };
                  map[k].total++; if (r.status === "Done") map[k].done++;
                });
                return Object.entries(map).map(([name, v]) => {
                  const pct = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0;
                  return (
                    <div key={name} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>{name}</span>
                        <span style={{ color: "#999" }}>{v.done}/{v.total} · {pct}%</span>
                      </div>
                      <div style={{ background: "#f0f0f0", borderRadius: 6, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#22c55e" : "#6366f1", borderRadius: 6, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ══════════ DATA TAB ══════════ */}
      {tab === "data" && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr>
                {columns.map(c => (
                  <th key={c.key} style={{ padding: "10px 12px", borderBottom: "2px solid #f0f0f0", color: "#888", fontWeight: 500, textAlign: "left", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span onClick={() => handleSort(c.key)} style={{ cursor: "pointer" }}>
                        {c.label} {sortField === c.key && (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </span>
                      <button onClick={() => deleteColumn(c.key)} title="Remove column"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 0, marginLeft: 4, lineHeight: 1 }}>
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                ))}
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #f0f0f0", width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  {columns.map(c => (
                    <td key={c.key} style={{ padding: "8px 12px" }}>
                      {editingId === row.id ? (
                        c.type === "select" ? (
                          <select value={editRow[c.key] ?? ""} onChange={e => setEditRow(prev => ({ ...prev, [c.key]: e.target.value }))}
                            style={{ ...selectStyle, padding: "4px 8px" }}>
                            <option value="">—</option>
                            {(c.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"}
                            value={editRow[c.key] ?? ""}
                            onChange={e => setEditRow(prev => ({ ...prev, [c.key]: c.type === "number" ? Number(e.target.value) : e.target.value }))}
                            style={{ ...inputStyle, padding: "4px 8px" }} />
                        )
                      ) : (
                        c.key === "status" ? <Pill color={STATUS_COLORS[row[c.key]] || "#888"}>{row[c.key]}</Pill> :
                        c.key === "priority" ? <Pill color={PRIORITY_COLORS[row[c.key]] || "#888"}>{row[c.key]}</Pill> :
                        <span style={{ color: "#333" }}>{row[c.key] ?? ""}</span>
                      )}
                    </td>
                  ))}
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                    {editingId === row.id ? (
                      <span style={{ display: "flex", gap: 4 }}>
                        <Btn onClick={saveEdit} variant="success" small><Check size={14} /></Btn>
                        <Btn onClick={cancelEdit} variant="ghost" small><X size={14} /></Btn>
                      </span>
                    ) : confirmDelete === row.id ? (
                      <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#ef4444" }}>Sure?</span>
                        <Btn onClick={() => deleteRow(row.id)} variant="danger" small><Check size={14} /></Btn>
                        <Btn onClick={() => setConfirmDelete(null)} variant="ghost" small><X size={14} /></Btn>
                      </span>
                    ) : (
                      <span style={{ display: "flex", gap: 4 }}>
                        <Btn onClick={() => startEdit(row)} variant="ghost" small><Pencil size={14} /></Btn>
                        <Btn onClick={() => setConfirmDelete(row.id)} variant="danger" small><Trash2 size={14} /></Btn>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td colSpan={columns.length + 1} style={{ padding: 40, textAlign: "center", color: "#aaa" }}>No data yet. Click "Add Row" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════ CHARTS TAB ══════════ */}
      {tab === "charts" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#888" }}>Group by:</span>
            <select value={chartX} onChange={e => setChartX(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
              {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <span style={{ fontSize: 13, color: "#888" }}>Measure:</span>
            <select value={chartMetric} onChange={e => setChartMetric(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
              <option value="count">Count</option>
              {numCols.length > 0 && <option value="sum">Sum</option>}
            </select>
            {chartMetric === "sum" && numCols.length > 0 && (
              <select value={chartNumCol} onChange={e => setChartNumCol(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
                {numCols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Bar Chart</h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey={chartMetric === "sum" ? "sum" : "count"} fill="#6366f1" radius={[6, 6, 0, 0]}
                    name={chartMetric === "sum" ? `Sum of ${columns.find(c => c.key === chartNumCol)?.label || chartNumCol}` : "Count"} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Pie Chart</h4>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey={chartMetric === "sum" ? "sum" : "count"} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={3} strokeWidth={0}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: "#555", fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Row Modal ── */}
      {showAddRow && (
        <Modal title="Add New Row" onClose={() => setShowAddRow(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {columns.map(c => (
              <div key={c.key}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>{c.label}</label>
                {c.type === "select" ? (
                  <select value={newRow[c.key] ?? ""} onChange={e => setNewRow(p => ({ ...p, [c.key]: e.target.value }))} style={selectStyle}>
                    <option value="">Select…</option>
                    {(c.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"}
                    value={newRow[c.key] ?? ""}
                    onChange={e => setNewRow(p => ({ ...p, [c.key]: c.type === "number" ? Number(e.target.value) : e.target.value }))}
                    style={inputStyle} placeholder={c.label} />
                )}
              </div>
            ))}
            <Btn onClick={addRow} variant="primary" style={{ marginTop: 8 }}><Plus size={14} /> Add Row</Btn>
          </div>
        </Modal>
      )}

      {/* ── Add Column Modal ── */}
      {showAddCol && (
        <Modal title="Add New Column" onClose={() => setShowAddCol(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>Column Name</label>
              <input value={newCol.label} onChange={e => setNewCol(p => ({ ...p, label: e.target.value }))}
                style={inputStyle} placeholder="e.g. Department" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>Type</label>
              <select value={newCol.type} onChange={e => setNewCol(p => ({ ...p, type: e.target.value }))} style={selectStyle}>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Dropdown</option>
              </select>
            </div>
            {newCol.type === "select" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>Options (comma-separated)</label>
                <input value={newCol.options} onChange={e => setNewCol(p => ({ ...p, options: e.target.value }))}
                  style={inputStyle} placeholder="e.g. Option A, Option B, Option C" />
              </div>
            )}
            <Btn onClick={addColumn} variant="primary" style={{ marginTop: 8 }} disabled={!newCol.label.trim()}><Plus size={14} /> Add Column</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
