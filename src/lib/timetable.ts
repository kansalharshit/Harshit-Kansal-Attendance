export type Group = 1 | 2 | 3;

export interface SlotOption {
  code: string;
  teacher: string;
  /** Present only in group slots: which group attends this option. */
  group?: Group;
  /** Optional label like "Workshop". */
  label?: string;
}

export interface Slot {
  id: string;
  /** 1 = Monday … 5 = Friday (JS getDay convention). */
  day: number;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  options: SlotOption[];
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const SUBJECT_NAMES: Record<string, string> = {
  "CS-111": "Computer Programming",
  "PH-101": "Physics",
  "PH-102": "Physics Lab",
  "HS-101": "Communication Skills",
  "HS-102": "Language Lab",
  "HS-103": "Humanities",
  "ME-101": "Engineering Graphics",
  "ME-102": "Workshop Practice",
  "MA-111": "Mathematics",
};

let counter = 0;
const id = () => `s${++counter}`;
const single = (day: number, start: string, end: string, code: string, teacher: string, label?: string): Slot => ({
  id: id(),
  day,
  start,
  end,
  options: [{ code, teacher, ...(label ? { label } : {}) }],
});
const groupSlot = (day: number, start: string, end: string, options: SlotOption[]): Slot => ({
  id: id(),
  day,
  start,
  end,
  options,
});

export function buildDefaultTimetable(): Slot[] {
  counter = 0;
  return [
    // Monday
    groupSlot(1, "12:00", "13:00", [
      { code: "CS-111", teacher: "Khalid", group: 1 },
      { code: "PH-102", teacher: "Shailja", group: 2 },
      { code: "HS-102", teacher: "Sumita", group: 3 },
    ]),
    single(1, "14:00", "15:00", "ME-101", "Abhishek"),
    single(1, "15:00", "16:00", "CS-111", "Khalid"),
    groupSlot(1, "17:00", "18:00", [{ code: "HS-102", teacher: "Sumita", group: 1 }]),
    // Tuesday
    single(2, "14:00", "15:00", "HS-101", "Sumita"),
    single(2, "15:00", "16:00", "HS-103", "Spriha"),
    // Wednesday
    groupSlot(3, "09:00", "10:00", [
      { code: "CS-111", teacher: "Khalid", group: 2 },
      { code: "PH-102", teacher: "Shailja", group: 3 },
    ]),
    single(3, "10:00", "11:00", "MA-111", "Shilpa"),
    single(3, "12:00", "13:00", "PH-101", "Shailja"),
    single(3, "14:00", "15:00", "HS-101", "Sumita"),
    single(3, "15:00", "16:00", "HS-103", "Spriha"),
    // Thursday
    single(4, "09:00", "10:00", "ME-101", "Abhishek"),
    single(4, "10:00", "11:00", "ME-102", "Ankush"),
    single(4, "11:00", "12:00", "MA-111", "Shilpa"),
    single(4, "12:00", "13:00", "PH-101", "Shailja"),
    groupSlot(4, "14:00", "15:00", [
      { code: "CS-111", teacher: "Khalid", group: 3 },
      { code: "PH-102", teacher: "Shailja", group: 1 },
      { code: "HS-102", teacher: "Sumita", group: 2 },
    ]),
    single(4, "16:00", "18:00", "ME-102", "Ankush", "Workshop"),
    // Friday
    single(5, "09:00", "10:00", "ME-101", "Abhishek"),
    single(5, "10:00", "11:00", "CS-111", "Khalid"),
    single(5, "11:00", "12:00", "MA-111", "Shilpa"),
    single(5, "12:00", "13:00", "PH-101", "Shailja"),
  ];
}

export const isGroupSlot = (slot: Slot) => slot.options.some((o) => o.group !== undefined);

/** Resolve which option (if any) the given group attends in this slot. */
export function resolveSlot(slot: Slot, group: Group): SlotOption | null {
  if (!isGroupSlot(slot)) return slot.options[0] ?? null;
  return slot.options.find((o) => o.group === group) ?? null;
}

const parseHM = (hhmm: string): [number, number] => {
  const parts = hhmm.split(":").map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0];
};

export const toMinutes = (hhmm: string) => {
  const [h, m] = parseHM(hhmm);
  return h * 60 + m;
};

export const fmtTime = (hhmm: string) => {
  const [h, m] = parseHM(hhmm);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
};

export function slotsForDay(timetable: Slot[], day: number): Slot[] {
  return timetable
    .filter((s) => s.day === day)
    .slice()
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

export const newSlotId = () => `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
