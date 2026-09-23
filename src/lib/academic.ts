import { addDays } from "./time";
import { resolveSlot, slotsForDay, toMinutes, type Group, type Slot } from "./timetable";
import { weekdayOf } from "./time";

/* ---------------- types ---------------- */

export const EXAM_TYPES = [
  "Mid Semester Exam",
  "End Semester Exam",
  "Practical Exam",
  "Quiz",
  "Class Test",
  "Other Exam",
] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const EVENT_TYPES = [
  "Registration",
  "Orientation",
  "Assignment deadline",
  "Project deadline",
  "Practical",
  "Viva",
  "Workshop",
  "Seminar",
  "Exam period",
  "Academic",
  "Other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface Holiday {
  id: string;
  date: string;
  endDate: string;
  name: string;
  note?: string;
}

export interface Leave {
  id: string;
  date: string;
  endDate: string;
  /** undefined = full day leave; otherwise a single class occurrence key */
  slotId?: string;
  code?: string;
  reason: string;
  note?: string;
}

export interface Cancellation {
  id: string;
  date: string;
  slotId: string;
  code: string;
  teacher: string;
  start: string;
  end: string;
  reason: string;
  note?: string;
}

export interface Reschedule {
  id: string;
  fromDate: string;
  slotId: string;
  code: string;
  teacher: string;
  fromStart: string;
  toDate: string;
  start: string;
  end: string;
  room?: string;
  reason?: string;
}

export interface Exam {
  id: string;
  name: string;
  type: ExamType;
  code: string;
  date: string;
  start: string;
  end: string;
  room?: string;
  notes?: string;
  completed: boolean;
}

export interface AcademicEvent {
  id: string;
  name: string;
  type: EventType;
  date: string;
  endDate: string;
  start?: string;
  end?: string;
  code?: string;
  description?: string;
}

export interface Academic {
  holidays: Holiday[];
  leaves: Leave[];
  cancellations: Cancellation[];
  reschedules: Reschedule[];
  exams: Exam[];
  events: AcademicEvent[];
}

export const ACADEMIC_KEYS = ["holidays", "leaves", "cancellations", "reschedules", "exams", "events"] as const;
export type AcademicKey = (typeof ACADEMIC_KEYS)[number];

export const emptyAcademic = (): Academic => ({
  holidays: [],
  leaves: [],
  cancellations: [],
  reschedules: [],
  exams: [],
  events: [],
});

export const newId = (p = "a") => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* ------------- official NIT Hamirpur 2026-27 calendar (editable seed) ------------- */

export function defaultAcademicEvents(): AcademicEvent[] {
  const mk = (name: string, type: EventType, date: string, endDate = date, description?: string): AcademicEvent => ({
    id: newId("e"),
    name,
    type,
    date,
    endDate,
    ...(description ? { description } : {}),
  });
  return [
    mk("Physical Reporting / 1st Semester Registration", "Registration", "2026-08-13", "2026-08-14"),
    mk("1st Semester Registration", "Registration", "2026-08-17"),
    mk("Commencement of Classes", "Academic", "2026-08-20"),
    mk("Mid Semester Examinations", "Exam period", "2026-09-21", "2026-09-26"),
    mk("End of Classes", "Academic", "2026-11-12"),
    mk("End Semester Practical Examinations", "Exam period", "2026-11-16", "2026-11-21"),
    mk("End Semester Theory Examinations", "Exam period", "2026-11-23", "2026-12-07"),
    mk("Last Date of Grade Submission", "Academic", "2026-12-14"),
    mk("Declaration of Result", "Academic", "2026-12-31"),
  ];
}

/* ---------------- helpers ---------------- */

export const inRange = (date: string, start: string, end?: string) => date >= start && date <= (end || start);

export const findHoliday = (a: Academic, date: string) => a.holidays.find((h) => inRange(date, h.date, h.endDate));

export const findFullDayLeave = (a: Academic, date: string) =>
  a.leaves.find((l) => !l.slotId && inRange(date, l.date, l.endDate));

export const findClassLeave = (a: Academic, date: string, slotId: string) =>
  a.leaves.find((l) => l.slotId === slotId && inRange(date, l.date, l.endDate));

export const findCancellation = (a: Academic, date: string, slotId: string) =>
  a.cancellations.find((c) => c.date === date && c.slotId === slotId);

export const findMovedOut = (a: Academic, date: string, slotId: string) =>
  a.reschedules.find((r) => r.fromDate === date && r.slotId === slotId);

export const RESCH_PREFIX = "resch:";

/* ---------------- occurrences ---------------- */

export type OccStatus = "class" | "holiday" | "cancelled" | "leave" | "moved";

export interface Occurrence {
  /** used as the attendance slotId */
  key: string;
  start: string;
  end: string;
  code: string;
  teacher: string;
  label?: string | undefined;
  group?: Group | undefined;
  status: OccStatus;
  /** true only when the class actually counts towards attendance */
  countable: boolean;
  reason?: string | undefined;
  room?: string | undefined;
  origin: "timetable" | "reschedule";
  movedTo?: { date: string; start: string } | undefined;
  movedFrom?: { date: string; start: string } | undefined;
}

export function occurrencesFor(date: string, timetable: Slot[], group: Group, a: Academic): Occurrence[] {
  const holiday = findHoliday(a, date);
  const fullLeave = findFullDayLeave(a, date);
  const out: Occurrence[] = [];

  for (const slot of slotsForDay(timetable, weekdayOf(date))) {
    const opt = resolveSlot(slot, group);
    if (!opt) continue;
    const moved = findMovedOut(a, date, slot.id);
    const cancel = findCancellation(a, date, slot.id);
    const leave = fullLeave ?? findClassLeave(a, date, slot.id);
    let status: OccStatus = "class";
    let reason: string | undefined;
    if (moved) {
      status = "moved";
      reason = moved.reason;
    } else if (holiday) {
      status = "holiday";
      reason = holiday.name;
    } else if (cancel) {
      status = "cancelled";
      reason = cancel.reason;
    } else if (leave) {
      status = "leave";
      reason = leave.reason;
    }
    out.push({
      key: slot.id,
      start: slot.start,
      end: slot.end,
      code: opt.code,
      teacher: opt.teacher,
      label: opt.label,
      group: opt.group,
      status,
      countable: status === "class",
      reason,
      origin: "timetable",
      movedTo: moved ? { date: moved.toDate, start: moved.start } : undefined,
    });
  }

  for (const r of a.reschedules.filter((x) => x.toDate === date)) {
    const key = `${RESCH_PREFIX}${r.id}`;
    const leave = fullLeave ?? findClassLeave(a, date, key);
    let status: OccStatus = "class";
    let reason: string | undefined = r.reason;
    if (holiday) {
      status = "holiday";
      reason = holiday.name;
    } else if (leave) {
      status = "leave";
      reason = leave.reason;
    }
    out.push({
      key,
      start: r.start,
      end: r.end,
      code: r.code,
      teacher: r.teacher,
      status,
      countable: status === "class",
      reason,
      room: r.room,
      origin: "reschedule",
      movedFrom: { date: r.fromDate, start: r.fromStart },
    });
  }

  return out.sort((x, y) => toMinutes(x.start) - toMinutes(y.start));
}

/** An attendance record is ignored when its occurrence is no longer a conducted class. */
export function recordExcluded(date: string, slotId: string, a: Academic): OccStatus | null {
  if (findHoliday(a, date)) return "holiday";
  if (slotId.startsWith(RESCH_PREFIX)) {
    const id = slotId.slice(RESCH_PREFIX.length);
    if (!a.reschedules.some((r) => r.id === id)) return "cancelled";
  } else {
    if (findMovedOut(a, date, slotId)) return "moved";
    if (findCancellation(a, date, slotId)) return "cancelled";
  }
  if (findFullDayLeave(a, date) || findClassLeave(a, date, slotId)) return "leave";
  return null;
}

/** Aggregated non-attendance counts per subject over a recent window. */
export function scanCounts(
  today: string,
  timetable: Slot[],
  group: Group,
  a: Academic,
  daysBack = 210,
): Map<string, { leave: number; cancelled: number; holiday: number; moved: number }> {
  const map = new Map<string, { leave: number; cancelled: number; holiday: number; moved: number }>();
  const bump = (code: string, k: "leave" | "cancelled" | "holiday" | "moved") => {
    if (!map.has(code)) map.set(code, { leave: 0, cancelled: 0, holiday: 0, moved: 0 });
    map.get(code)![k] += 1;
  };
  for (let i = daysBack; i >= 0; i--) {
    const d = addDays(today, -i);
    for (const o of occurrencesFor(d, timetable, group, a)) {
      if (o.status !== "class") bump(o.code, o.status);
    }
  }
  return map;
}

export const STATUS_ICON: Record<string, string> = {
  class: "🟢",
  present: "✅",
  absent: "🔴",
  leave: "🏖️",
  holiday: "🎉",
  cancelled: "❌",
  moved: "🔄",
  rescheduled: "🔄",
  exam: "📝",
  event: "📅",
};

export function examStart(e: { date: string; start: string }): number {
  const [y, m, d] = e.date.split("-").map(Number);
  const [h, min] = e.start.split(":").map(Number);
  // IST (UTC+5:30)
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, (h ?? 0) - 5, (min ?? 0) - 30);
}

export function daysUntil(dateStr: string, today: string): number {
  const p = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((p(dateStr) - p(today)) / 86400000);
}

export function countdownLabel(dateStr: string, today: string): string {
  const n = daysUntil(dateStr, today);
  if (n < 0) return `${-n} day${n === -1 ? "" : "s"} ago`;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `${n} days remaining`;
}
