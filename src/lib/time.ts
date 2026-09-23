import { useEffect, useState } from "react";

export const TZ = "Asia/Kolkata";

export interface ISTNow {
  /** YYYY-MM-DD in IST */
  date: string;
  /** 0 = Sunday … 6 = Saturday, in IST */
  weekday: number;
  /** minutes since midnight IST (fractional seconds excluded) */
  minutes: number;
  seconds: number;
  hour: number;
  minute: number;
  /** epoch ms */
  ms: number;
}

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hour12: false,
});

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function getISTNow(d: Date = new Date()): ISTNow {
  const parts = new Map<string, string>();
  for (const p of fmt.formatToParts(d)) parts.set(p.type, p.value);
  const hour = Number(parts.get("hour")) % 24;
  const minute = Number(parts.get("minute"));
  const second = Number(parts.get("second"));
  return {
    date: `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`,
    weekday: WD[parts.get("weekday") ?? "Sun"] ?? 0,
    minutes: hour * 60 + minute,
    seconds: second,
    hour,
    minute,
    ms: d.getTime(),
  };
}

/** Date string (YYYY-MM-DD) for a Date object interpreted in IST. */
export function istDateString(d: Date): string {
  return getISTNow(d).date;
}

/** Weekday for a YYYY-MM-DD string (calendar day, timezone independent). */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return dt.toISOString().slice(0, 10);
}

export function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  return dt.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  return dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatClock(now: ISTNow): string {
  const h12 = now.hour % 12 === 0 ? 12 : now.hour % 12;
  return `${h12}:${String(now.minute).padStart(2, "0")}:${String(now.seconds).padStart(2, "0")} ${now.hour >= 12 ? "PM" : "AM"}`;
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Ticks every second on the client. Returns null before hydration. */
export function useISTNow(): ISTNow | null {
  const [now, setNow] = useState<ISTNow | null>(null);
  useEffect(() => {
    setNow(getISTNow());
    const t = setInterval(() => setNow(getISTNow()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}
