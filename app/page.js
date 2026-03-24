"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight,
  FolderOpen, FileText, StickyNote, CalendarDays, Users, LayoutDashboard,
  Clock, AlertTriangle, CheckCircle, Circle, Search, Download, Upload,
  GripVertical, Link2, MapPin, Hash
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════

const STORE_KEY = "pm_dashboard_v2";
const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; } };
const save = (d) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch {} };

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT DATA
// ═══════════════════════════════════════════════════════════════════════════

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const makeProject = (name, color) => ({
  id: uid(), name, color,
  tasks: [],
  files: [],
  notes: [{ id: uid(), text: "", updatedAt: new Date().toISOString() }],
  timeline: [],
  team: [],
});

const DEFAULTS = [
  (() => {
    const p = makeProject("Website Redesign", "#6366f1");
    p.tasks = [
      { id: uid(), title: "Design new homepage", status: "done", priority: "high", assignee: "Alice", dueDate: "2026-03-15", description: "" },
      { id: uid(), title: "Implement responsive nav", status: "in_progress", priority: "high", assignee: "Bob", dueDate: "2026-03-20", description: "" },
      { id: uid(), title: "Migrate CMS content", status: "todo", priority: "medium", assignee: "Carol", dueDate: "2026-03-28", description: "" },
    ];
    p.files = [
      { id: uid(), name: "Design Mockups", location: "Figma — shared team workspace", type: "design" },
      { id: uid(), name: "Brand Guidelines v3", location: "Google Drive > Marketing > Brand", type: "doc" },
    ];
    p.team = [
      { id: uid(), name: "Alice", role: "Designer" },
      { id: uid(), name: "Bob", role: "Frontend Dev" },
      { id: uid(), name: "Carol", role: "Content Manager" },
    ];
    p.timeline = [
      { id: uid(), title: "Design approval", date: "2026-03-18", done: true },
      { id: uid(), title: "Dev sprint 1 ends", date: "2026-03-25", done: false },
      { id: uid(), title: "Launch", date: "2026-04-01", done: false },
    ];
    p.notes[0].text = "Focus on mobile-first approach. Client wants bold colors and large typography.";
    return p;
  })(),
  (() => {
    const p = makeProject("Mobile App v2", "#22c55e");
    p.tasks = [
      { id: uid(), title: "Setup React Native project", status: "done", priority: "high", assignee: "Dan", dueDate: "2026-03-10", description: "" },
      { id: uid(), title: "Build auth flow", status: "in_progress", priority: "high", assignee: "Eve", dueDate: "2026-03-22", description: "" },
    ];
    p.files = [
      { id: uid(), name: "API Documentation", location: "Notion > Engineering > API Docs", type: "doc" },
    ];
    p.team = [
      { id: uid(), name: "Dan", role: "Mobile Dev" },
      { id: uid(), name: "Eve", role: "Backend Dev" },
    ];
    p.timeline = [
      { id: uid(), title: "Alpha release", date: "2026-04-01", done: false },
    ];
    p.notes[0].text = "Using Expo for faster iteration. Need to test on both iOS and Android.";
    return p;
  })(),
  (() => {
    const p = makeProject("API Migration", "#f59e0b");
    p.tasks = [
      { id: uid(), title: "Audit existing endpoints", status: "todo", priority: "medium", assignee: "", dueDate: "2026-03-30", description: "" },
    ];
    p.notes[0].text = "Migration from REST to GraphQL. Need to maintain backward compatibility.";
    return p;
  })(),
];

// ═══════════════════════════════════════════════════════════════════════════
// COLORS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_MAP = {
  todo: { label: "To Do", color: "#94a3b8", icon: Circle },
  in_progress: { label: "In Progress", color: "#3b82f6", icon: Clock },
  done: { label: "Done", color: "#22c55e", icon: CheckCircle },
  overdue: { label: "Overdue", color: "#ef4444", icon: AlertTriangle },
};

const PRIORITY_MAP = {
  high: { label: "High", color: "#ef4444" },
  medium: { label: "Medium", color: "#f59e0b" },
  low: { label: "Low", color: "#22c55e" },
};

const PROJECT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#ec4899", "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4"];

const SECTIONS = [
  { key: "tasks", label: "Tasks", icon: CheckCircle },
  { key: "files", label: "Files", icon: FileText },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "timeline", label: "Timeline", icon: CalendarDays },
  { key: "team", label: "Team", icon: Users },
];

// ═══════════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Btn = ({ onClick, children, variant = "default", small, disabled, style: sx }) => {
  const base = { display: "inline-flex", alignItems: "center", gap: 5, border: "none", borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", padding: small ? "5px 10px" : "8px 14px", transition: "all 0.15s", opacity: disabled ? 0.4 : 1 };
  const v = { default: { background: "#f0f0f0", color: "#555" }, primary: { background: "#6366f1", color: "#fff" }, danger: { background: "#fef2f2", color: "#ef4444" }, success: { background: "#f0fdf4", color: "#16a34a" }, ghost: { background: "transparent", color: "#888" } };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v[variant], ...sx }}>{children}</button>;
};

const Pill = ({ color, children, small }) => (
  <span style={{ background: `${color}18`, color, borderRadius: 10, padding: small ? "1px 8px" : "2px 10px", fontSize: small ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>
);

const Modal = ({ title, onClose, children, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 28, width: "92%", maxWidth: wide ? 600 : 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111" }}>{title}</h3>
        <Btn onClick={onClose} variant="ghost" small><X size={16} /></Btn>
      </div>
      {children}
    </div>
  </div>
);

const inputStyle = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e0e0e0", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" };
const selectStyle = { ...inputStyle, cursor: "pointer", background: "#fff" };
const textareaStyle = { ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: "inherit" };

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: "#777", display: "block", marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const [projects, setProjects] = useState(DEFAULTS);
  const [activeProjectId, setActiveProjectId] = useState(DEFAULTS[0].id);
  const [activeSection, setActiveSection] = useState("tasks");
  const [loaded, setLoaded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modals
  const [showAddProject, setShowAddProject] = useState(false);
  const [editProjectId, setEditProjectId] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [showAddFile, setShowAddFile] = useState(false);
  const [editFileId, setEditFileId] = useState(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [editMilestoneId, setEditMilestoneId] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editMemberId, setEditMemberId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");

  // Form states
  const [form, setForm] = useState({});

  // ── Load / Save ──
  useEffect(() => {
    const d = load();
    if (d?.projects?.length) { setProjects(d.projects); setActiveProjectId(d.activeProjectId || d.projects[0].id); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    save({ projects, activeProjectId });
  }, [projects, activeProjectId, loaded]);

  // ── Helpers ──
  const project = projects.find(p => p.id === activeProjectId) || projects[0];
  const updateProject = (id, fn) => setProjects(prev => prev.map(p => p.id === id ? fn({ ...p }) : p));
  const updateCurrent = (fn) => updateProject(activeProjectId, fn);

  // ── Project CRUD ──
  const addProject = () => {
    const p = makeProject(form.name || "New Project", form.color || PROJECT_COLORS[projects.length % PROJECT_COLORS.length]);
    setProjects(prev => [...prev, p]);
    setActiveProjectId(p.id);
    setShowAddProject(false);
    setForm({});
  };

  const saveEditProject = () => {
    updateProject(editProjectId, p => ({ ...p, name: form.name || p.name, color: form.color || p.color }));
    setEditProjectId(null);
    setForm({});
  };

  const deleteProject = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(projects.find(p => p.id !== id)?.id || "");
    setConfirmDelete(null);
  };

  // ── Task CRUD ──
  const addTask = () => {
    const t = { id: uid(), title: form.title || "Untitled Task", status: form.status || "todo", priority: form.priority || "medium", assignee: form.assignee || "", dueDate: form.dueDate || "", description: form.description || "" };
    updateCurrent(p => ({ ...p, tasks: [...p.tasks, t] }));
    setShowAddTask(false); setForm({});
  };

  const saveEditTask = () => {
    updateCurrent(p => ({ ...p, tasks: p.tasks.map(t => t.id === editTaskId ? { ...t, ...form } : t) }));
    setEditTaskId(null); setForm({});
  };

  const deleteTask = (id) => { updateCurrent(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== id) })); setConfirmDelete(null); };

  const toggleTaskStatus = (id) => {
    const order = ["todo", "in_progress", "done"];
    updateCurrent(p => ({ ...p, tasks: p.tasks.map(t => {
      if (t.id !== id) return t;
      const next = order[(order.indexOf(t.status) + 1) % order.length];
      return { ...t, status: next };
    })}));
  };

  // ── File CRUD ──
  const addFile = () => {
    const f = { id: uid(), name: form.name || "Untitled File", location: form.location || "", type: form.type || "doc" };
    updateCurrent(p => ({ ...p, files: [...p.files, f] }));
    setShowAddFile(false); setForm({});
  };

  const saveEditFile = () => {
    updateCurrent(p => ({ ...p, files: p.files.map(f => f.id === editFileId ? { ...f, ...form } : f) }));
    setEditFileId(null); setForm({});
  };

  const deleteFile = (id) => { updateCurrent(p => ({ ...p, files: p.files.filter(f => f.id !== id) })); setConfirmDelete(null); };

  // ── Notes ──
  const updateNotes = (text) => {
    updateCurrent(p => ({ ...p, notes: [{ ...p.notes[0], text, updatedAt: new Date().toISOString() }] }));
  };

  // ── Timeline CRUD ──
  const addMilestone = () => {
    const m = { id: uid(), title: form.title || "Milestone", date: form.date || "", done: false };
    updateCurrent(p => ({ ...p, timeline: [...p.timeline, m].sort((a, b) => a.date.localeCompare(b.date)) }));
    setShowAddMilestone(false); setForm({});
  };

  const saveEditMilestone = () => {
    updateCurrent(p => ({ ...p, timeline: p.timeline.map(m => m.id === editMilestoneId ? { ...m, ...form } : m).sort((a, b) => a.date.localeCompare(b.date)) }));
    setEditMilestoneId(null); setForm({});
  };

  const toggleMilestone = (id) => {
    updateCurrent(p => ({ ...p, timeline: p.timeline.map(m => m.id === id ? { ...m, done: !m.done } : m) }));
  };

  const deleteMilestone = (id) => { updateCurrent(p => ({ ...p, timeline: p.timeline.filter(m => m.id !== id) })); setConfirmDelete(null); };

  // ── Team CRUD ──
  const addMember = () => {
    const m = { id: uid(), name: form.name || "Member", role: form.role || "" };
    updateCurrent(p => ({ ...p, team: [...p.team, m] }));
    setShowAddMember(false); setForm({});
  };

  const saveEditMember = () => {
    updateCurrent(p => ({ ...p, team: p.team.map(m => m.id === editMemberId ? { ...m, ...form } : m) }));
    setEditMemberId(null); setForm({});
  };

  const deleteMember = (id) => { updateCurrent(p => ({ ...p, team: p.team.filter(m => m.id !== id) })); setConfirmDelete(null); };

  // ── Export / Import ──
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ projects, version: 2 }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "dashboard-backup.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const fileRef = useRef();
  const importData = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.projects) { setProjects(d.projects); setActiveProjectId(d.projects[0]?.id || ""); }
      } catch {}
    };
    reader.readAsText(file); e.target.value = "";
  };

  // ── Filtered tasks ──
  const filteredTasks = useMemo(() => {
    if (!project) return [];
    let t = [...project.tasks];
    if (taskFilter !== "all") t = t.filter(x => x.status === taskFilter);
    if (taskSearch) { const s = taskSearch.toLowerCase(); t = t.filter(x => x.title.toLowerCase().includes(s) || x.assignee.toLowerCase().includes(s)); }
    return t;
  }, [project, taskFilter, taskSearch]);

  // ── Stats ──
  const stats = useMemo(() => {
    if (!project) return { total: 0, done: 0, inProgress: 0, overdue: 0, pct: 0 };
    const t = project.tasks;
    const done = t.filter(x => x.status === "done").length;
    return { total: t.length, done, inProgress: t.filter(x => x.status === "in_progress").length, overdue: t.filter(x => x.status === "overdue").length, pct: t.length ? Math.round((done / t.length) * 100) : 0 };
  }, [project]);

  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#aaa" }}>Loading…</div>;
  if (!project) return null;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", height: "100vh", background: "#f5f5f7", color: "#333" }}>

      {/* ══════════ SIDEBAR ══════════ */}
      <div style={{ width: sidebarCollapsed ? 56 : 260, minWidth: sidebarCollapsed ? 56 : 260, background: "#fff", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", transition: "width 0.2s, min-width 0.2s", overflow: "hidden" }}>

        {/* Sidebar header */}
        <div style={{ padding: sidebarCollapsed ? "16px 12px" : "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {!sidebarCollapsed && <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Projects</span>}
          <button onClick={() => setSidebarCollapsed(c => !c)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: 4 }}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Project list */}
        <div style={{ flex: 1, overflowY: "auto", padding: sidebarCollapsed ? "8px 6px" : "8px 12px" }}>
          {projects.map(p => (
            <div key={p.id} onClick={() => setActiveProjectId(p.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarCollapsed ? "10px 8px" : "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: p.id === activeProjectId ? `${p.color}12` : "transparent", border: p.id === activeProjectId ? `1.5px solid ${p.color}40` : "1.5px solid transparent", transition: "all 0.15s" }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: p.color, flexShrink: 0 }} />
              {!sidebarCollapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: p.id === activeProjectId ? 600 : 400, color: p.id === activeProjectId ? "#111" : "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#bbb" }}>{p.tasks.length} tasks</div>
                </div>
              )}
              {!sidebarCollapsed && p.id === activeProjectId && (
                <button onClick={(e) => { e.stopPropagation(); setEditProjectId(p.id); setForm({ name: p.name, color: p.color }); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", padding: 2 }}><Pencil size={13} /></button>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding: sidebarCollapsed ? "12px 6px" : "12px", borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 6 }}>
          <Btn onClick={() => { setShowAddProject(true); setForm({ color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length] }); }} variant="primary" small style={{ justifyContent: "center", width: "100%" }}>
            <Plus size={14} /> {!sidebarCollapsed && "New Project"}
          </Btn>
          {!sidebarCollapsed && (
            <div style={{ display: "flex", gap: 4 }}>
              <Btn onClick={exportData} small style={{ flex: 1, justifyContent: "center" }}><Download size={13} /> Backup</Btn>
              <Btn onClick={() => fileRef.current?.click()} small style={{ flex: 1, justifyContent: "center" }}><Upload size={13} /> Restore</Btn>
              <input ref={fileRef} type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
            </div>
          )}
        </div>
      </div>

      {/* ══════════ MAIN AREA ══════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Project header */}
        <div style={{ padding: "16px 28px", borderBottom: "1px solid #eee", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: project.color }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#111" }}>{project.name}</h1>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#999" }}>
            <span><strong style={{ color: "#6366f1" }}>{stats.total}</strong> total</span>
            <span><strong style={{ color: "#22c55e" }}>{stats.done}</strong> done</span>
            <span><strong style={{ color: "#3b82f6" }}>{stats.inProgress}</strong> active</span>
            {stats.overdue > 0 && <span><strong style={{ color: "#ef4444" }}>{stats.overdue}</strong> overdue</span>}
            <span style={{ color: project.color, fontWeight: 600 }}>{stats.pct}% complete</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "#f0f0f0" }}>
          <div style={{ height: "100%", width: `${stats.pct}%`, background: project.color, transition: "width 0.4s ease" }} />
        </div>

        {/* Section tabs */}
        <div style={{ padding: "0 28px", borderBottom: "1px solid #eee", background: "#fff", display: "flex", gap: 0 }}>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = activeSection === s.key;
            return (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 18px", border: "none", borderBottom: active ? `2px solid ${project.color}` : "2px solid transparent", background: "none", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#111" : "#888", cursor: "pointer", transition: "all 0.15s" }}>
                <Icon size={15} /> {s.label}
                {s.key === "tasks" && project.tasks.length > 0 && (
                  <span style={{ background: "#f0f0f0", borderRadius: 8, padding: "0 6px", fontSize: 11, color: "#888" }}>{project.tasks.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>

          {/* ────── TASKS ────── */}
          {activeSection === "tasks" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "#bbb" }} />
                  <input placeholder="Search tasks…" value={taskSearch} onChange={e => setTaskSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 30 }} />
                </div>
                <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
                  <option value="all">All statuses</option>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <div style={{ flex: "1 1 0" }} />
                <Btn onClick={() => { setShowAddTask(true); setForm({}); }} variant="primary" small><Plus size={14} /> Add Task</Btn>
              </div>

              {filteredTasks.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: "#ccc" }}>
                  {project.tasks.length === 0 ? "No tasks yet. Add your first task!" : "No tasks match your filter."}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredTasks.map(t => {
                  const S = STATUS_MAP[t.status] || STATUS_MAP.todo;
                  const StatusIcon = S.icon;
                  return (
                    <div key={t.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", border: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                      <button onClick={() => toggleTaskStatus(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: S.color, flexShrink: 0 }} title="Click to cycle status">
                        <StatusIcon size={20} />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: t.status === "done" ? "#aaa" : "#222", textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                          {t.assignee && <span style={{ fontSize: 11, color: "#999" }}>{t.assignee}</span>}
                          {t.dueDate && <span style={{ fontSize: 11, color: "#bbb" }}>{t.dueDate}</span>}
                        </div>
                      </div>
                      <Pill color={PRIORITY_MAP[t.priority]?.color || "#888"} small>{PRIORITY_MAP[t.priority]?.label || t.priority}</Pill>
                      <Pill color={S.color} small>{S.label}</Pill>
                      <Btn onClick={() => { setEditTaskId(t.id); setForm({ title: t.title, status: t.status, priority: t.priority, assignee: t.assignee, dueDate: t.dueDate, description: t.description }); }} variant="ghost" small><Pencil size={13} /></Btn>
                      <Btn onClick={() => setConfirmDelete({ type: "task", id: t.id })} variant="ghost" small><Trash2 size={13} /></Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ────── FILES ────── */}
          {activeSection === "files" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#999", margin: 0 }}>Reference files and their locations for this project.</p>
                <Btn onClick={() => { setShowAddFile(true); setForm({}); }} variant="primary" small><Plus size={14} /> Add File</Btn>
              </div>

              {project.files.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: "#ccc" }}>No files yet. Add file references for quick access.</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {project.files.map(f => (
                  <div key={f.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
                      <FileText size={18} style={{ color: project.color, flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#222", marginBottom: 4 }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: "#999", display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={11} /> {f.location || "No location specified"}
                        </div>
                      </div>
                      <Btn onClick={() => { setEditFileId(f.id); setForm({ name: f.name, location: f.location, type: f.type }); }} variant="ghost" small><Pencil size={13} /></Btn>
                      <Btn onClick={() => setConfirmDelete({ type: "file", id: f.id })} variant="ghost" small><Trash2 size={13} /></Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ────── NOTES ────── */}
          {activeSection === "notes" && (
            <div>
              <p style={{ fontSize: 13, color: "#999", margin: "0 0 12px" }}>Quick notes and thoughts for this project.</p>
              <textarea
                value={project.notes[0]?.text || ""}
                onChange={e => updateNotes(e.target.value)}
                placeholder="Type your notes here… These save automatically."
                style={{ ...textareaStyle, minHeight: 400, fontSize: 14, lineHeight: 1.7, padding: 20, background: "#fff", borderRadius: 12, border: "1px solid #eee" }}
              />
              <div style={{ fontSize: 11, color: "#ccc", marginTop: 8 }}>
                Auto-saved · Last updated: {project.notes[0]?.updatedAt ? new Date(project.notes[0].updatedAt).toLocaleString() : "—"}
              </div>
            </div>
          )}

          {/* ────── TIMELINE ────── */}
          {activeSection === "timeline" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#999", margin: 0 }}>Key milestones and deadlines.</p>
                <Btn onClick={() => { setShowAddMilestone(true); setForm({}); }} variant="primary" small><Plus size={14} /> Add Milestone</Btn>
              </div>

              {project.timeline.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: "#ccc" }}>No milestones yet. Add key dates and deadlines.</div>
              )}

              <div style={{ position: "relative", paddingLeft: 24 }}>
                {project.timeline.length > 0 && (
                  <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, background: "#eee" }} />
                )}
                {project.timeline.map((m, i) => {
                  const isPast = m.date && new Date(m.date) < new Date();
                  return (
                    <div key={m.id} style={{ position: "relative", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
                      <button onClick={() => toggleMilestone(m.id)}
                        style={{ position: "absolute", left: -18, width: 22, height: 22, borderRadius: 11, border: `2px solid ${m.done ? "#22c55e" : isPast ? "#ef4444" : project.color}`, background: m.done ? "#22c55e" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                        {m.done && <Check size={12} color="#fff" />}
                      </button>
                      <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "12px 16px", marginLeft: 12, border: "1px solid #f0f0f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: m.done ? "#aaa" : "#222", textDecoration: m.done ? "line-through" : "none" }}>{m.title}</span>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: m.done ? "#22c55e" : isPast ? "#ef4444" : "#999" }}>{m.date}</span>
                            <Btn onClick={() => { setEditMilestoneId(m.id); setForm({ title: m.title, date: m.date }); }} variant="ghost" small><Pencil size={13} /></Btn>
                            <Btn onClick={() => setConfirmDelete({ type: "milestone", id: m.id })} variant="ghost" small><Trash2 size={13} /></Btn>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ────── TEAM ────── */}
          {activeSection === "team" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#999", margin: 0 }}>Team members working on this project.</p>
                <Btn onClick={() => { setShowAddMember(true); setForm({}); }} variant="primary" small><Plus size={14} /> Add Member</Btn>
              </div>

              {project.team.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: "#ccc" }}>No team members yet.</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {project.team.map(m => {
                  const taskCount = project.tasks.filter(t => t.assignee === m.name).length;
                  const doneCount = project.tasks.filter(t => t.assignee === m.name && t.status === "done").length;
                  return (
                    <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #f0f0f0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 20, background: project.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#222" }}>{m.name}</div>
                          <div style={{ fontSize: 12, color: "#999" }}>{m.role || "Team Member"}</div>
                        </div>
                        <Btn onClick={() => { setEditMemberId(m.id); setForm({ name: m.name, role: m.role }); }} variant="ghost" small><Pencil size={13} /></Btn>
                        <Btn onClick={() => setConfirmDelete({ type: "member", id: m.id })} variant="ghost" small><Trash2 size={13} /></Btn>
                      </div>
                      <div style={{ marginTop: 10, display: "flex", gap: 12, fontSize: 11, color: "#aaa" }}>
                        <span><strong style={{ color: "#555" }}>{taskCount}</strong> tasks</span>
                        <span><strong style={{ color: "#22c55e" }}>{doneCount}</strong> done</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* Add Project */}
      {showAddProject && (
        <Modal title="New Project" onClose={() => setShowAddProject(false)}>
          <Field label="Project Name"><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="e.g. Client Portal" autoFocus /></Field>
          <Field label="Color">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: 14, background: c, border: form.color === c ? "3px solid #111" : "3px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          </Field>
          <Btn onClick={addProject} variant="primary" disabled={!form.name?.trim()} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}><Plus size={14} /> Create Project</Btn>
        </Modal>
      )}

      {/* Edit Project */}
      {editProjectId && (
        <Modal title="Edit Project" onClose={() => { setEditProjectId(null); setForm({}); }}>
          <Field label="Project Name"><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Color">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: 14, background: c, border: form.color === c ? "3px solid #111" : "3px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          </Field>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={saveEditProject} variant="primary" style={{ flex: 1, justifyContent: "center" }}><Check size={14} /> Save</Btn>
            <Btn onClick={() => setConfirmDelete({ type: "project", id: editProjectId })} variant="danger" style={{ justifyContent: "center" }}><Trash2 size={14} /> Delete Project</Btn>
          </div>
        </Modal>
      )}

      {/* Add Task */}
      {showAddTask && (
        <Modal title="Add Task" onClose={() => { setShowAddTask(false); setForm({}); }}>
          <Field label="Title"><input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="What needs to be done?" autoFocus /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Status">
              <select value={form.status || "todo"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority || "medium"} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={selectStyle}>
                {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Assignee"><input value={form.assignee || ""} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} style={inputStyle} placeholder="Who's responsible?" /></Field>
            <Field label="Due Date"><input type="date" value={form.dueDate || ""} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={inputStyle} /></Field>
          </div>
          <Field label="Description"><textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={textareaStyle} placeholder="Optional details…" /></Field>
          <Btn onClick={addTask} variant="primary" disabled={!form.title?.trim()} style={{ marginTop: 4, width: "100%", justifyContent: "center" }}><Plus size={14} /> Add Task</Btn>
        </Modal>
      )}

      {/* Edit Task */}
      {editTaskId && (
        <Modal title="Edit Task" onClose={() => { setEditTaskId(null); setForm({}); }}>
          <Field label="Title"><input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Status">
              <select value={form.status || "todo"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority || "medium"} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={selectStyle}>
                {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Assignee"><input value={form.assignee || ""} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} style={inputStyle} /></Field>
            <Field label="Due Date"><input type="date" value={form.dueDate || ""} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={inputStyle} /></Field>
          </div>
          <Field label="Description"><textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={textareaStyle} /></Field>
          <Btn onClick={saveEditTask} variant="primary" style={{ marginTop: 4, width: "100%", justifyContent: "center" }}><Check size={14} /> Save Changes</Btn>
        </Modal>
      )}

      {/* Add File */}
      {showAddFile && (
        <Modal title="Add File Reference" onClose={() => { setShowAddFile(false); setForm({}); }}>
          <Field label="File Name"><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="e.g. Design Mockups" autoFocus /></Field>
          <Field label="Location / Path"><input value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} placeholder="e.g. Google Drive > Projects > Designs" /></Field>
          <Btn onClick={addFile} variant="primary" disabled={!form.name?.trim()} style={{ marginTop: 4, width: "100%", justifyContent: "center" }}><Plus size={14} /> Add File</Btn>
        </Modal>
      )}

      {/* Edit File */}
      {editFileId && (
        <Modal title="Edit File Reference" onClose={() => { setEditFileId(null); setForm({}); }}>
          <Field label="File Name"><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Location / Path"><input value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} /></Field>
          <Btn onClick={saveEditFile} variant="primary" style={{ marginTop: 4, width: "100%", justifyContent: "center" }}><Check size={14} /> Save</Btn>
        </Modal>
      )}

      {/* Add Milestone */}
      {showAddMilestone && (
        <Modal title="Add Milestone" onClose={() => { setShowAddMilestone(false); setForm({}); }}>
          <Field label="Milestone Title"><input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="e.g. Beta release" autoFocus /></Field>
          <Field label="Date"><input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} /></Field>
          <Btn onClick={addMilestone} variant="primary" disabled={!form.title?.trim()} style={{ marginTop: 4, width: "100%", justifyContent: "center" }}><Plus size={14} /> Add Milestone</Btn>
        </Modal>
      )}

      {/* Edit Milestone */}
      {editMilestoneId && (
        <Modal title="Edit Milestone" onClose={() => { setEditMilestoneId(null); setForm({}); }}>
          <Field label="Title"><input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Date"><input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} /></Field>
          <Btn onClick={saveEditMilestone} variant="primary" style={{ marginTop: 4, width: "100%", justifyContent: "center" }}><Check size={14} /> Save</Btn>
        </Modal>
      )}

      {/* Add Member */}
      {showAddMember && (
        <Modal title="Add Team Member" onClose={() => { setShowAddMember(false); setForm({}); }}>
          <Field label="Name"><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="e.g. John" autoFocus /></Field>
          <Field label="Role"><input value={form.role || ""} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle} placeholder="e.g. Frontend Developer" /></Field>
          <Btn onClick={addMember} variant="primary" disabled={!form.name?.trim()} style={{ marginTop: 4, width: "100%", justifyContent: "center" }}><Plus size={14} /> Add Member</Btn>
        </Modal>
      )}

      {/* Edit Member */}
      {editMemberId && (
        <Modal title="Edit Team Member" onClose={() => { setEditMemberId(null); setForm({}); }}>
          <Field label="Name"><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Role"><input value={form.role || ""} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle} /></Field>
          <Btn onClick={saveEditMember} variant="primary" style={{ marginTop: 4, width: "100%", justifyContent: "center" }}><Check size={14} /> Save</Btn>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <Modal title="Confirm Delete" onClose={() => setConfirmDelete(null)}>
          <p style={{ fontSize: 14, color: "#555", margin: "0 0 16px" }}>Are you sure? This action can't be undone.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => {
              const { type, id } = confirmDelete;
              if (type === "task") deleteTask(id);
              else if (type === "file") deleteFile(id);
              else if (type === "milestone") deleteMilestone(id);
              else if (type === "member") deleteMember(id);
              else if (type === "project") { deleteProject(id); setEditProjectId(null); }
            }} variant="danger" style={{ flex: 1, justifyContent: "center" }}><Trash2 size={14} /> Yes, Delete</Btn>
            <Btn onClick={() => setConfirmDelete(null)} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
