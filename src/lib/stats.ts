import type { AttendanceRecord } from "./store";
import { resolveSlot, slotsForDay, type Group, type Slot, SUBJECT_NAMES } from "./timetable";
import { addDays, weekdayOf } from "./time";
import { emptyAcademic, recordExcluded, scanCounts, type Academic } from "./academic";

/** Records that still count: their occurrence was actually conducted. */
export function effectiveRecords(records: AttendanceRecord[], academic: Academic): AttendanceRecord[] {
  return records.filter((r) => recordExcluded(r.date, r.slotId, academic) === null);
}

export interface SubjectStat {
  code: string;
  name: string;
  teachers: string[];
  present: number;
  absent: number;
  leave: number;
  cancelled: number;
  holiday: number;
  moved: number;
  /** present + absent */
  conducted: number;
  pct: number | null;
  /** classes that can be skipped while staying >= target (when above target) */
  canSkip: number;
  /** consecutive classes needed to reach target (when below target) */
  needToAttend: number;
  belowTarget: boolean;
  tone: "good" | "near" | "bad" | "muted";
}

export function subjectStats(
  records: AttendanceRecord[],
  timetable: Slot[],
  group: Group,
  target: number,
  academic: Academic = emptyAcademic(),
  today?: string,
): SubjectStat[] {
  const t = target / 100;
  const eff = effectiveRecords(records, academic);
  const counts = today ? scanCounts(today, timetable, group, academic) : new Map();

  const subjects = new Map<string, Set<string>>();
  for (const slot of timetable) {
    const opt = resolveSlot(slot, group);
    if (!opt) continue;
    if (!subjects.has(opt.code)) subjects.set(opt.code, new Set());
    subjects.get(opt.code)!.add(opt.teacher);
  }
  for (const r of eff) {
    if (!subjects.has(r.code)) subjects.set(r.code, new Set());
    if (r.teacher) subjects.get(r.code)!.add(r.teacher);
  }

  const out: SubjectStat[] = [];
  for (const [code, teachers] of subjects) {
    const rs = eff.filter((r) => r.code === code);
    const present = rs.filter((r) => r.status === "present").length;
    const absent = rs.length - present;
    const conducted = present + absent;
    const pct = conducted ? (present / conducted) * 100 : null;
    const c = counts.get(code) ?? { leave: 0, cancelled: 0, holiday: 0, moved: 0 };
    let canSkip = 0;
    let needToAttend = 0;
    if (conducted > 0) {
      if (present / conducted >= t) canSkip = t > 0 ? Math.floor(present / t - conducted) : Infinity;
      else needToAttend = t < 1 ? Math.ceil((t * conducted - present) / (1 - t)) : Infinity;
    }
    const tone: SubjectStat["tone"] =
      pct === null ? "muted" : pct >= target ? (pct < target + 5 ? "near" : "good") : "bad";
    out.push({
      code,
      name: SUBJECT_NAMES[code] ?? "",
      teachers: [...teachers],
      present,
      absent,
      leave: c.leave,
      cancelled: c.cancelled,
      holiday: c.holiday,
      moved: c.moved,
      conducted,
      pct,
      canSkip,
      needToAttend,
      belowTarget: pct !== null && pct < target,
      tone,
    });
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

export function overall(records: AttendanceRecord[], academic: Academic = emptyAcademic()) {
  const eff = effectiveRecords(records, academic);
  const present = eff.filter((r) => r.status === "present").length;
  const total = eff.length;
  return { present, absent: total - present, total, pct: total ? (present / total) * 100 : null };
}

export function monthlySummary(records: AttendanceRecord[], yyyymm: string, academic: Academic = emptyAcademic()) {
  const rs = records.filter((r) => r.date.startsWith(yyyymm));
  const o = overall(rs, academic);
  const days = new Set(effectiveRecords(rs, academic).map((r) => r.date)).size;
  return { ...o, days };
}

/**
 * Streak = consecutive class days (with scheduled, conducted classes for your group)
 * ending today/yesterday where you were marked present at least once and never absent.
 */
export function computeStreak(
  records: AttendanceRecord[],
  timetable: Slot[],
  group: Group,
  today: string,
  academic: Academic = emptyAcademic(),
): number {
  const eff = effectiveRecords(records, academic);
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const r of eff) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }
  const hasClasses = (date: string) =>
    slotsForDay(timetable, weekdayOf(date)).some((s) => resolveSlot(s, group) !== null);

  let streak = 0;
  let cursor = today;
  if (!byDate.has(today)) cursor = addDays(today, -1);
  for (let i = 0; i < 400; i++) {
    if (!hasClasses(cursor) || !byDate.has(cursor)) {
      if (hasClasses(cursor)) break;
      cursor = addDays(cursor, -1);
      continue;
    }
    const rs = byDate.get(cursor)!;
    if (rs.some((r) => r.status === "absent")) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
