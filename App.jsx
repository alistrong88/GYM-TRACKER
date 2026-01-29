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
 * - Runs in a basic Vite + React app
 * - Dependency: recharts
 * - Data persists in localStorage
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
        { id: "goblet_squat", name: "Goblet Squat", unit: "kg", start: "" },
        { id: "romanian_deadlift", name: "Romanian Deadlift", unit: "kg", start: "" },
        { id: "walking_lunges", name: "Walking Lunges", unit: "kg", start: "" },
        { id: "standing_calf_raise", name: "Standing Calf Raise", unit: "kg", start: "" },
        { id: "ab_crunch_machine", name: "Ab Crunch Machine", unit: "kg", start: "" },
      ],
    },
    d3: {
      title: "Day 3 - Shoulders (Volume) + Pull + Abs",
      cardio: { type: "Incline walk", minutesDefault: 15 },
      exercises: [
        { id: "upright_cable_row", name: "Upright Cable Row (wide grip)", unit: "kg", start: "" },
        { id: "lat_pulldown", name: "Lat Pulldown", unit: "kg", start: "" },
        { id: "face_pull", name: "Face Pull", unit: "kg", start: "" },
        { id: "cable_lateral_raise", name: "Cable Lateral Raise", unit: "kg", start: "" },
        { id: "triceps_pushdown", name: "Triceps Pushdown", unit: "kg", start: "" },
        { id: "ab_crunch_machine", name: "Ab Crunch Machine", unit: "kg", start: "" },
      ],
    },
    d4: {
      title: "Day 4 - Upper Accessories + Conditioning",
      cardio: { type: "Stairs or incline walk", minutesDefault: 15 },
      exercises: [
        { id: "arnold_press", name: "Arnold Press", unit: "kg", start: "" },
        { id: "rear_delt_fly", name: "Rear Delt Fly", unit: "kg", start: "" },
        { id: "biceps_curl", name: "Biceps Curl", unit: "kg", start: "" },
        { id: "hammer_curl", name: "Hammer Curl", unit: "kg", start: "" },
      ],
    },
  },
};

function safeParseJSON(text) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

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

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 14,
};

const labelStyle = { fontSize: 12, color: "#666", marginBottom: 4 };

const primaryBtn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

export default function App() {
  const [tab, setTab] = useState("log");
  const [sessions, setSessions] = useState([]);

  const [date, setDate] = useState(todayISO());
  const [dayKey, setDayKey] = useState("d1");
  const [notes, setNotes] = useState("");
  const [cardioMinutes, setCardioMinutes] = useState(PROGRAM.days.d1.cardio.minutesDefault);
  const [entries, setEntries] = useState({});
  const [selectedExerciseId, setSelectedExerciseId] = useState("shoulder_press");

  // Load
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = safeParseJSON(raw);
    if (parsed.ok && parsed.data && Array.isArray(parsed.data.sessions)) {
      setSessions(parsed.data.sessions);
    }
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }));
  }, [sessions]);

  // Day change defaults
  useEffect(() => {
    const day = PROGRAM.days[dayKey];
    setCardioMinutes(day.cardio.minutesDefault);

    const nextEntries = {};
    for (const ex of day.exercises) {
      const last = [...sessions]
        .reverse()
        .find((s) => s.entries && s.entries[ex.id] && s.entries[ex.id].weight !== "");
      const defaultWeight = last ? last.entries[ex.id].weight : ex.start;
      nextEntries[ex.id] = { weight: defaultWeight ?? "", reps: "", sets: "" };
    }
    setEntries(nextEntries);
  }, [dayKey, sessions]);

  const allExercises = useMemo(() => {
    const map = new Map();
    Object.values(PROGRAM.days).forEach((d) => {
      d.exercises.forEach((ex) => {
        if (!map.has(ex.id)) map.set(ex.id, ex.name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, []);

  const chartData = useMemo(() => {
    return sessions
      .filter((s) => s.entries && s.entries[selectedExerciseId])
      .map((s) => {
        const e = s.entries[selectedExerciseId];
        const w = e?.weight;
        const weight = w === "" || w === null || w === undefined ? null : Number(w);
        return { date: s.date, weight, dayKey: s.dayKey };
      })
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [sessions, selectedExerciseId]);

  const lastTwo = useMemo(() => {
    const valid = chartData.filter((d) => typeof d.weight === "number" && !Number.isNaN(d.weight));
    const last = valid[valid.length - 1] ?? null;
    const prev = valid[valid.length - 2] ?? null;
    const delta = last && prev ? Number((last.weight - prev.weight).toFixed(2)) : null;
    const best = valid.length ? Math.max(...valid.map((d) => d.weight)) : null;
    return { last, prev, delta, best };
  }, [chartData]);

  function updateEntry(exId, field, value) {
    setEntries((prev) => ({
      ...prev,
      [exId]: { ...(prev[exId] || {}), [field]: value },
    }));
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

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Gym Program Tracker</h1>
      <p style={{ marginTop: 6, color: "#555" }}>
        Log your weights, reps, and cardio. Track progress with a chart. Data saves in this browser.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Weekly Split</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {PROGRAM.weekSplit.map((d) => (
              <div key={d.key} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{PROGRAM.days[d.key].cardio.type}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
            Tip: compounds 90–120s rest, isolation 45–75s. Cardio stays steady.
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[{ id: "log", label: "Log" }, { id: "progress", label: "Progress" }, { id: "history", label: "History" }].map((t) => (
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
            <div style={{ flex: 1 }} />
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
                        {ex.start !== "" && ex.start != null ? (
                          <div style={{ fontSize: 12, color: "#666" }}>Start: {ex.start}{ex.unit}</div>
                        ) : null}
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
                <div style={{ fontSize: 12, color: "#666" }}>
                  Saving a session with the same date and day will overwrite the previous one.
                </div>
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
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#666" }}>Last</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{lastTwo.last?.weight ?? "-"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{lastTwo.last?.date ?? ""}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#666" }}>Change</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: lastTwo.delta > 0 ? "#0f766e" : lastTwo.delta < 0 ? "#be123c" : "#111" }}>
                        {lastTwo.delta == null ? "-" : prettyDelta(lastTwo.delta)}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>vs previous</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#666" }}>Best</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{lastTwo.best ?? "-"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>to date</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Weight over time</div>
                <div style={{ height: 320 }}>
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={20} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip labelFormatter={(label) => `Date: ${label}`} formatter={(value) => [value, "Weight (kg)"]} />
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

              <div style={{ fontSize: 12, color: "#666" }}>
                Tip: Fill in sets and reps if you want, but the chart tracks weight for simplicity.
              </div>
            </div>
          ) : null}

          {tab === "history" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>Logged Sessions</div>
                <div style={{ fontSize: 12, color: "#666" }}>{sessions.length} total</div>
              </div>

              {sessions.length === 0 ? (
                <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 10, color: "#666" }}>
                  No sessions yet. Use the Log tab to add your first workout.
                </div>
              ) : (
                [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1)).map((s) => (
                  <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.dayName}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>{s.date}</div>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                          Cardio: {s.cardio?.minutes ?? "-"} min ({s.cardio?.type ?? ""})
                        </div>
                        {s.notes ? (
                          <div style={{ marginTop: 8, background: "#f6f6f6", borderRadius: 10, padding: 8, fontSize: 12 }}>
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

                    <div style={{ height: 1, background: "#eee", margin: "10px 0" }} />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
                      {Object.entries(s.entries ?? {}).map(([exId, ex]) => {
                        const exName = allExercises.find((e) => e.id === exId)?.name ?? exId;
                        const w = ex?.weight;
                        return (
                          <div key={exId} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{exName}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>
                              Weight: {w === "" ? "-" : w} kg
                              {ex?.sets !== "" && ex?.reps !== "" ? ` | ${ex.sets} x ${ex.reps}` : ""}
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
      </div>
    </div>
  );
}
