import { getState, sanitizeState, type AppState, type AttendanceRecord } from "./store";

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportJSON() {
  const state = getState();
  download(`nit-attendance-${stamp()}.json`, JSON.stringify(state, null, 2), "application/json");
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function exportCSV() {
  const { records } = getState();
  const header = ["date", "slotId", "code", "teacher", "status", "timestamp"];
  const rows = records
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.timestamp.localeCompare(b.timestamp))
    .map((r) => [r.date, r.slotId, r.code, r.teacher, r.status, r.timestamp].map(csvCell).join(","));
  download(`nit-attendance-${stamp()}.csv`, [header.join(","), ...rows].join("\n"), "text/csv");
}

export type ImportResult =
  | { kind: "json"; state: AppState }
  | { kind: "csv"; records: AttendanceRecord[] }
  | { kind: "error"; message: string };

function parseCSV(text: string): AttendanceRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0] ?? "").map((h) => h.trim().toLowerCase());
  const idx = (n: string) => header.indexOf(n);
  const iDate = idx("date"),
    iSlot = idx("slotid"),
    iCode = idx("code"),
    iTeacher = idx("teacher"),
    iStatus = idx("status"),
    iTs = idx("timestamp");
  if (iDate < 0 || iSlot < 0 || iCode < 0 || iStatus < 0) throw new Error("CSV must have date, slotId, code, status columns");
  const recs: AttendanceRecord[] = [];
  for (const line of lines.slice(1)) {
    const c = split(line);
    const status = (c[iStatus] ?? "").trim().toLowerCase();
    if (status !== "present" && status !== "absent") continue;
    recs.push({
      id: `i${Math.random().toString(36).slice(2, 9)}`,
      date: (c[iDate] ?? "").trim(),
      slotId: (c[iSlot] ?? "").trim(),
      code: (c[iCode] ?? "").trim(),
      teacher: iTeacher >= 0 ? (c[iTeacher] ?? "").trim() : "",
      status,
      timestamp: iTs >= 0 && c[iTs] ? c[iTs]!.trim() : new Date().toISOString(),
    });
  }
  return recs;
}

export async function parseImportFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  try {
    if (file.name.toLowerCase().endsWith(".csv") || !text.trim().startsWith("{")) {
      return { kind: "csv", records: parseCSV(text) };
    }
    const state = sanitizeState(JSON.parse(text));
    if (!state) return { kind: "error", message: "Not a valid backup file" };
    return { kind: "json", state };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "Could not read file" };
  }
}
