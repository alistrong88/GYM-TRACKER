import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/**
 * Gym Program Tracker (Simple)
 * - Vite + React
 * - Dependency: recharts
 * - Data persists in localStorage
 *
 * New feature: Month calendar (click a day to log, strict colors by workout day).
 */

const STORAGE_KEY = "gymTrackerDataV1";

const todayISO = () => new Date().toISOString().slice(0, 10);

const PROGRAM = {
  weekSplit: [
    { key: "d1", name: "Day 1: Shoulders Heavy + Push + Abs" },
    { key: "d2", name: "Day 2: Light Lower + Stairs + Abs" },
    { key: "d3", name: "Day 3: Shoulders Volume + Pull + Abs" },
    { key: "d4", name: "Day 4: Upper Accessories + Conditioning" },
  ],
  days: {
    d1: {
      title: "Day 1 - Shoulders (Heavy) + Push + Abs",
      cardio: { type: "Incline walk", minutesDefault: 15 },
      exercises: [
        { id: "shoulder_press", name: "Shoulder Press", unit: "kg", start: 35 },
        { id: "lat_raise_machine", name: "Lateral Raise Machine", unit: "kg", start: 20 },
        { id: "incline_db_press", name: "Incline DB Press", unit: "kg", start: 22.5 },
        { id: "rear_delt_fly_cable", name: "Rear Delt Fly (cable)", unit: "kg", start: 15 },
        { id: "triceps_pushdown", name: "Triceps Pushdown", unit: "kg", start: 40 },
        { id: "ab_crunch_machine", name: "Ab Crunch Machine", unit: "kg", start: 40 },
      ],
    },
    d2: {
      title: "Day 2 - Light Lower + Stairs + Abs",
      cardio: { type: "Stair machine", minutesDefault: 20 },
      exercises: [
        { id: "goblet_squat", name: "Goblet Squat", unit: "kg", start: null },
        { id: "romanian_deadlift", name: "Romanian Deadlift", unit: "kg", start: null },
        { id: "walking_lunges", name: "Walking Lunges", unit: "kg", start: null },
        { id: "standing_calf_raise", name: "Standing Calf Raise", unit: "kg", start: null },
        { id: "ab_crunch_machine", name: "Ab Crunch Machine", unit: "kg", start: null },
      ],
    },
    d3: {
      title: "Day 3 - Shoulders (Volume) + Pull + Abs",
      cardio: { type: "Incline walk", minutesDefault: 15 },
      exercises: [
        { id: "upright_cable_row", name: "Upright Cable Row (wide grip)", unit: "kg", start: null },
        { id: "lat_pulldown", name: "Lat Pulldown", unit: "kg", start: null },
        { id: "face_pull", name: "Face Pull", unit: "kg", start: null },
        { id: "cable_lateral_raise", name: "Cable Lateral Raise", unit: "kg", start: null },
        { id: "triceps_pushdown", name: "Triceps Pushdown", unit: "kg", start: null },
        { id: "ab_crunch_machine", name: "Ab Crunch Machine", unit: "kg", start: null },
      ],
    },
    d4: {
      title: "Day 4 - Upper Accessories + Conditioning",
      cardio: { type: "Stairs or incline walk", minutesDefault: 15 },
      exercises: [
        { id: "arnold_press", name: "Arnold Press", unit: "kg", start: null },
        { id: "rear_delt_fly", name: "Rear Delt Fly", unit: "kg", start: null },
        { id: "biceps_curl", name: "Biceps Curl", unit: "kg", start: null },
        { id: "hammer_curl", name: "Hammer Curl", unit: "kg", start: null },
      ],
    },
  },
};

const DAY_COLORS = {
  d1: { bg: "#dbeafe", border: "#60a5fa", label: "D1" },
  d2: { bg: "#dcfce7", border: "#22c55e", label: "D2" },
  d3: { bg: "#ede9fe", border: "#8b5cf6", label: "D3" },
  d4: { bg: "#ffedd5", border: "#fb923c", label: "D4" },
};

const inputStyle = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 10,
  border: "1px solid #ddd",
  outline: "none",
  fontSize: 14,
  background: "#fff",
};

const labelStyle = { fontSize: 12, color: "#666", marginBottom: 4 };

const primaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

function clampNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return n;
}

function prettyDelta(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}`;
}

function safeParseJSON(text) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function isoFromParts(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function monthLabel(dateObj) {
  return dateObj.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function buildMonthGrid(viewDate) {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const daysInMonth = last.getDate();

  // Make Monday the first day of week
  const jsDay = first.getDay(); // 0 Sun ... 6 Sat
  const offset = (jsDay + 6) % 7; // Mon=0 ... Sun=6

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks, y, m };
}

function CalendarMonth({ viewDate, sessionsByDate, onPickDate }) {
  const { weeks, y, m } = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{monthLabel(viewDate)}</div>
        <div style={{ fontSize: 12, color: "#666" }}>Tap a day to log or edit</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 10 }}>
        {weekdays.map((w) => (
          <div key={w} style={{ fontSize: 12, color: "#666", textAlign: "center", padding: "6px 0" }}>
            {w}
          </div>
        ))}

        {weeks.flat().map((d, idx) => {
          if (!d) return <div key={`e-${idx}`} style={{ padding: 10 }} />;
          const iso = isoFromParts(y, m, d);
          const session = sessionsByDate.get(iso);
          const meta = session ? DAY_COLORS[session.dayKey] : null;
          const bg = meta ? meta.bg : "#fff";
          const border = meta ? meta.border : "#eee";

          return (
            <button
              key={iso}
              onClick={() => onPickDate(iso)}
              style={{
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: bg,
                padding: 10,
                minHeight: 58,
                cursor: "pointer",
                textAlign: "left",
              }}
              title={session ? session.dayName : "No session logged"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>{d}</div>
                {session ? (
                  <div style={{ fontSize: 11, padding: "2px 6px", borderRadius: 999, border: `1px solid ${border}` }}>
                    {meta?.label}
                  </div>
                ) : null}
              </div>
              {session ? (
                <div style={{ fontSize: 11, color: "#555", marginTop: 6, lineHeight: 1.2 }}>
                  {PROGRAM.days[session.dayKey]?.title?.replace("Day ", "").split("-")[0]?.trim()}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#999", marginTop: 6 }}>Tap to log</div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        {PROGRAM.weekSplit.map((d) => {
          const c = DAY_COLORS[d.key];
          return (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: c.bg, border: `1px solid ${c.border}` }} />
              <span>{d.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GymProgramTracker() {
  const [tab, setTab] = useState("log");
  const [sessions, setSessions] = useState([]);

  // Log form state
  const [date, setDate] = useState(todayISO());
  const [dayKey, setDayKey] = useState("d1");
  const [notes, setNotes] = useState("");
  const [cardioMinutes, setCardioMinutes] = useState(PROGRAM.days.d1.cardio.minutesDefault);
  const [entries, setEntries] = useState({});

  // Calendar
  const [viewDate, setViewDate] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  // Chart state
  const [selectedExerciseId, setSelectedExerciseId] = useState("shoulder_press");

  // Load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = safeParseJSON(raw);
    if (parsed.ok && parsed.data && Array.isArray(parsed.data.sessions)) {
      setSessions(parsed.data.sessions);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }));
  }, [sessions]);

  const sessionsByDate = useMemo(() => {
    const map = new Map();
    for (const s of sessions) map.set(s.date, s);
    return map;
  }, [sessions]);

  const allExercises = useMemo(() => {
    const map = new Map();
    Object.values(PROGRAM.days).forEach((d) => {
      d.exercises.forEach((ex) => {
        if (!map.has(ex.id)) map.set(ex.id, ex.name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, []);

  // When day changes, reset entry inputs to starting weights if present
  useEffect(() => {
    const day = PROGRAM.days[dayKey];
    setCardioMinutes(day.cardio.minutesDefault);

    const nextEntries = {};
    for (const ex of day.exercises) {
      // Pick last logged value for this exercise if available; else use start value
      const last = [...sessions]
        .reverse()
        .find((s) => s.entries && s.entries[ex.id] && s.entries[ex.id].weight !== "");
      const defaultWeight = last ? last.entries[ex.id].weight : ex.start;
      nextEntries[ex.id] = {
        weight: defaultWeight ?? "",
        reps: "",
        sets: "",
      };
    }

    setEntries(nextEntries);
  }, [dayKey]);

  function updateEntry(exId, field, value) {
    setEntries((prev) => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        [field]: value,
      },
    }));
  }

  function loadSessionForDate(iso) {
    const session = sessionsByDate.get(iso);
    if (!session) {
      // New session, default to Day 1 but keep current dayKey if you want
      setDate(iso);
      setTab("log");
      return;
    }

    setDate(session.date);
    setDayKey(session.dayKey);
    setNotes(session.notes || "");
    setCardioMinutes(session.cardio?.minutes ?? PROGRAM.days[session.dayKey].cardio.minutesDefault);

    // Fill entries exactly as stored
    const day = PROGRAM.days[session.dayKey];
    const filled = {};
    for (const ex of day.exercises) {
      const e = session.entries?.[ex.id] ?? { weight: "", reps: "", sets: "" };
      filled[ex.id] = {
        weight: e.weight ?? "",
        reps: e.reps ?? "",
        sets: e.sets ?? "",
      };
    }
    setEntries(filled);
    setTab("log");
  }

  function saveSession() {
    const day = PROGRAM.days[dayKey];

    const cleanEntries = {};
    for (const ex of day.exercises) {
      const e = entries[ex.id] ?? { weight: "", reps: "", sets: "" };
      cleanEntries[ex.id] = {
        weight: e.weight === "" ? "" : clampNumber(e.weight),
        reps: e.reps === "" ? "" : clampNumber(e.reps),
        sets: e.sets === "" ? "" : clampNumber(e.sets),
      };
    }

    const payload = {
      id: `${date}-${dayKey}-${Math.random().toString(16).slice(2)}`,
      date,
      dayKey,
      dayName: day.title,
      cardio: {
        type: day.cardio.type,
        minutes: cardioMinutes === "" ? "" : clampNumber(cardioMinutes),
      },
      notes: notes.trim(),
      entries: cleanEntries,
      createdAt: new Date().toISOString(),
    };

    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.date === date && s.dayKey === dayKey);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = payload;
        return copy;
      }

      // Also replace if same date but different dayKey, because calendar is per-day
      const idxDateOnly = prev.findIndex((s) => s.date === date);
      if (idxDateOnly >= 0) {
        const copy = [...prev];
        copy[idxDateOnly] = payload;
        return copy;
      }

      return [...prev, payload];
    });

    setNotes("");
    setTab("progress");
  }

  function deleteSession(id) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ sessions }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gym-tracker-export-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importDataFromFile(file) {
    const text = await file.text();
    const parsed = safeParseJSON(text);
    if (!parsed.ok) {
      alert(`Import failed: ${parsed.error}`);
      return;
    }
    if (!parsed.data || !Array.isArray(parsed.data.sessions)) {
      alert("Import failed: expected { sessions: [...] }");
      return;
    }
    setSessions(parsed.data.sessions);
    alert("Import complete.");
  }

  function clearAll() {
    const ok = confirm("Delete all logged sessions? This cannot be undone.");
    if (!ok) return;
    setSessions([]);
  }

  const day = PROGRAM.days[dayKey];

  const chartData = useMemo(() => {
    const rows = sessions
      .filter((s) => s.entries && s.entries[selectedExerciseId])
      .map((s) => {
        const e = s.entries[selectedExerciseId];
        const w = e?.weight;
        const weight = w === "" || w === null || w === undefined ? null : Number(w);
        return { date: s.date, weight, dayKey: s.dayKey };
      })
      .sort((a, b) => (a.date > b.date ? 1 : -1));
    return rows;
  }, [sessions, selectedExerciseId]);

  const lastTwo = useMemo(() => {
    const valid = chartData.filter((d) => typeof d.weight === "number" && !Number.isNaN(d.weight));
    const last = valid[valid.length - 1] ?? null;
    const prev = valid[valid.length - 2] ?? null;
    const delta = last && prev ? Number((last.weight - prev.weight).toFixed(2)) : null;
    const best = valid.length ? Math.max(...valid.map((d) => d.weight)) : null;
    return { last, prev, delta, best };
  }, [chartData]);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Gym Program Tracker</h1>
      <p style={{ marginTop: 6, color: "#555" }}>
        Month calendar plus workout logging and progress charts. Data saves in this browser.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {/* Calendar */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                const d = new Date(viewDate);
                d.setMonth(d.getMonth() - 1);
                setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
            >
              Prev
            </button>
            <button
              onClick={() => {
                const d = new Date();
                setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date(viewDate);
                d.setMonth(d.getMonth() + 1);
                setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
            >
              Next
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={exportData} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>
              Export
            </button>
            <label style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>
              Import
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importDataFromFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <button onClick={clearAll} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>
              Clear
            </button>
          </div>
        </div>

        <CalendarMonth
          viewDate={viewDate}
          sessionsByDate={sessionsByDate}
          onPickDate={(iso) => {
            loadSessionForDate(iso);
          }}
        />

        {/* Tabs */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              { id: "log", label: "Log" },
              { id: "progress", label: "Progress" },
              { id: "history", label: "History" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: tab === t.id ? "#111" : "#fff",
                  color: tab === t.id ? "#fff" : "#111",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "log" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div>
                  <div style={labelStyle}>Date</div>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={labelStyle}>Workout Day</div>
                  <select value={dayKey} onChange={(e) => setDayKey(e.target.value)} style={inputStyle}>
                    {PROGRAM.weekSplit.map((d) => (
                      <option key={d.key} value={d.key}>
                        {PROGRAM.days[d.key].title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Cardio Minutes</div>
                  <input inputMode="decimal" value={cardioMinutes} onChange={(e) => setCardioMinutes(e.target.value)} style={inputStyle} />
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{day.cardio.type}</div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{day.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                  {day.exercises.map((ex) => (
                    <div key={ex.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{ex.name}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>Unit: {ex.unit}</div>
                        </div>
                        {ex.start != null ? <div style={{ fontSize: 12, color: "#666" }}>Start: {ex.start}{ex.unit}</div> : null}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                        <div>
                          <div style={labelStyle}>Weight</div>
                          <input
                            inputMode="decimal"
                            value={entries?.[ex.id]?.weight ?? ""}
                            onChange={(e) => updateEntry(ex.id, "weight", e.target.value)}
                            style={inputStyle}
                            placeholder="kg"
                          />
                        </div>
                        <div>
                          <div style={labelStyle}>Sets</div>
                          <input
                            inputMode="numeric"
                            value={entries?.[ex.id]?.sets ?? ""}
                            onChange={(e) => updateEntry(ex.id, "sets", e.target.value)}
                            style={inputStyle}
                            placeholder="optional"
                          />
                        </div>
                        <div>
                          <div style={labelStyle}>Reps</div>
                          <input
                            inputMode="numeric"
                            value={entries?.[ex.id]?.reps ?? ""}
                            onChange={(e) => updateEntry(ex.id, "reps", e.target.value)}
                            style={inputStyle}
                            placeholder="optional"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={labelStyle}>Notes (optional)</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, width: "100%", padding: 10 }}
                  placeholder="Sleep, energy, form cues, etc."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "#666" }}>Saving the same date overwrites the existing session for that date.</div>
                <button onClick={saveSession} style={primaryBtn}>Save Session</button>
              </div>
            </div>
          ) : null}

          {tab === "progress" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                <div>
                  <div style={labelStyle}>Exercise</div>
                  <select value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)} style={inputStyle}>
                    {allExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    <div>
                      <div style={labelStyle}>Last</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{lastTwo.last?.weight ?? "-"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{lastTwo.last?.date ?? ""}</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Change</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{lastTwo.delta == null ? "-" : prettyDelta(lastTwo.delta)}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>vs previous</div>
                    </div>
                    <div>
                      <div style={labelStyle}>Best</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{lastTwo.best ?? "-"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>to date</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Weight over time</div>
                <div style={{ height: 320 }}>
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={20} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) => [value, "Weight (kg)"]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line type="monotone" dataKey="weight" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
                      No data yet. Log a session to see your chart.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "history" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>Logged Sessions</div>
                <div style={{ fontSize: 12, color: "#666" }}>{sessions.length} total</div>
              </div>

              {sessions.length === 0 ? (
                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, color: "#666" }}>No sessions yet.</div>
              ) : (
                [...sessions]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((s) => (
                    <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{s.dayName}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>{s.date}</div>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                            Cardio: {s.cardio?.minutes ?? "-"} min ({s.cardio?.type ?? ""})
                          </div>
                          {s.notes ? (
                            <div style={{ marginTop: 8, background: "#f6f6f6", padding: 8, borderRadius: 10, fontSize: 12 }}>
                              {s.notes}
                            </div>
                          ) : null}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => {
                              setTab("progress");
                              const first = Object.keys(s.entries ?? {})[0];
                              if (first) setSelectedExerciseId(first);
                            }}
                            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                          >
                            View chart
                          </button>
                          <button
                            onClick={() => deleteSession(s.id)}
                            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8, marginTop: 10 }}>
                        {Object.entries(s.entries ?? {}).map(([exId, ex]) => {
                          const exName = allExercises.find((e) => e.id === exId)?.name ?? exId;
                          const w = ex?.weight;
                          const hasSR = ex?.sets !== "" && ex?.reps !== "";
                          return (
                            <div key={exId} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 10 }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{exName}</div>
                              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                                Weight: {w === "" ? "-" : w} kg{hasSR ? ` | ${ex.sets} x ${ex.reps}` : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : null}
        </div>

        {/* Weekly split reminder */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Weekly Split</div>
          <div style={{ display: "grid", gap: 8 }}>
            {PROGRAM.weekSplit.map((d) => (
              <div key={d.key} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{PROGRAM.days[d.key].cardio.type}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
