import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ClassCard } from "@/components/ClassCard";
import { findRecord, useAppState } from "@/lib/store";
import { computeStreak, monthlySummary, overall, subjectStats } from "@/lib/stats";
import { addDays, formatShortDate, formatTimestamp, useISTNow, weekdayOf } from "@/lib/time";
import { resolveSlot, slotsForDay, DAY_NAMES } from "@/lib/timetable";
import { cn } from "@/lib/utils";

const TITLE = "Attendance — Harshit Kansal's Attendance";
const DESC = "Subject-wise attendance totals, percentages, 75% target warnings, streak and monthly summary.";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const { records, timetable, settings, academic } = useAppState();
  const now = useISTNow();
  const [tab, setTab] = useState<"subjects" | "history" | "day">("subjects");
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  const today = now?.date ?? "";
  const stats = subjectStats(records, timetable, settings.group, settings.target, academic, today);
  const ov = overall(records, academic);
  const streak = now ? computeStreak(records, timetable, settings.group, today, academic) : 0;
  const month = now ? monthlySummary(records, today.slice(0, 7), academic) : null;
  const date = pickedDate ?? today;

  return (
    <main className="px-4 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Attendance</h1>

      <section className="mt-4 surface-card overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <Ring pct={ov.pct} target={settings.target} />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Overall</p>
            <p className="text-3xl font-extrabold tabular">{ov.pct === null ? "—" : `${ov.pct.toFixed(1)}%`}</p>
            <p className="text-sm text-muted-foreground">
              {ov.present} present · {ov.absent} absent · target {settings.target}%
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border text-center">
          <div className="p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Streak</p>
            <p className="text-xl font-extrabold tabular">{streak} <span className="text-sm font-semibold text-muted-foreground">days</span></p>
          </div>
          <div className="p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {now ? new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1)).toLocaleString("en-IN", { month: "long", timeZone: "UTC" }) : "This month"}
            </p>
            <p className="text-xl font-extrabold tabular">
              {month && month.pct !== null ? `${Math.round(month.pct)}%` : "—"}{" "}
              <span className="text-sm font-semibold text-muted-foreground">{month ? `${month.present}/${month.total}` : ""}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 rounded-full bg-muted p-1">
        {(["subjects", "day", "history"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={cn(
              "h-10 rounded-full text-sm font-bold capitalize transition-colors",
              tab === v ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
            )}
          >
            {v === "day" ? "By date" : v}
          </button>
        ))}
      </div>

      {tab === "subjects" && (
        <ul className="mt-4 space-y-3">
          {stats.map((s) => {
            const pct = s.pct;
            const tone = pct === null ? "muted" : pct >= settings.target ? "good" : "bad";
            return (
              <li key={s.code} className="surface-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold">{s.code}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.name ? `${s.name} · ` : ""}
                      {s.teachers.join(", ")}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-extrabold tabular",
                      tone === "good" && "text-success",
                      tone === "bad" && "text-destructive",
                      tone === "muted" && "text-muted-foreground",
                    )}
                  >
                    {pct === null ? "—" : `${Math.round(pct)}%`}
                  </p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", tone === "bad" ? "bg-destructive" : "bg-success")}
                    style={{ width: `${pct ?? 0}%` }}
                  />
                  <div className="relative -mt-2.5 h-2.5">
                    <span className="absolute top-0 h-full w-0.5 bg-foreground/40" style={{ left: `${settings.target}%` }} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">
                    {s.present} present · {s.absent} absent · {s.conducted} total
                  </span>
                  {s.conducted > 0 &&
                    (s.belowTarget ? (
                      <span className="inline-flex items-center gap-1 font-bold text-destructive">
                        <AlertTriangle className="size-3.5" /> attend next {s.needToAttend === Infinity ? "all" : s.needToAttend}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-success">
                        <CheckCircle2 className="size-3.5" /> can skip {s.canSkip === Infinity ? "∞" : s.canSkip}
                      </span>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "day" && now && (
        <section className="mt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPickedDate(addDays(date, -1))}
              aria-label="Previous day"
              className="flex size-12 items-center justify-center rounded-full bg-card shadow-card"
            >
              <ChevronLeft className="size-5" />
            </button>
            <label className="surface-card flex h-12 flex-1 items-center justify-center px-3">
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && setPickedDate(e.target.value)}
                className="w-full bg-transparent text-center text-sm font-bold outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setPickedDate(addDays(date, 1))}
              disabled={date >= today}
              aria-label="Next day"
              className="flex size-12 items-center justify-center rounded-full bg-card shadow-card disabled:opacity-40"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">
            {formatShortDate(date)}
            {date === today ? " · Today" : ""}
          </p>
          <DayMarker date={date} />
        </section>
      )}

      {tab === "history" && (
        <ul className="mt-4 space-y-2">
          {records.length === 0 && (
            <li className="rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
              No attendance marked yet. Mark your first class from Home.
            </li>
          )}
          {records
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp))
            .slice(0, 200)
            .map((r) => (
              <li key={r.id} className="surface-card flex items-center gap-3 p-3">
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    r.status === "present" ? "bg-success" : "bg-destructive",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">
                    {r.code} <span className="text-xs font-semibold text-muted-foreground">· {r.teacher}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(r.date)} · marked {formatTimestamp(r.timestamp)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase",
                    r.status === "present" ? "bg-success-soft text-success" : "bg-danger-soft text-destructive",
                  )}
                >
                  {r.status}
                </span>
              </li>
            ))}
        </ul>
      )}
    </main>
  );
}

function DayMarker({ date }: { date: string }) {
  const { records, timetable, settings, academic } = useAppState();
  const wd = weekdayOf(date);
  const items = slotsForDay(timetable, wd)
    .map((slot) => ({ slot, option: resolveSlot(slot, settings.group) }))
    .filter((x) => x.option !== null);
  if (items.length === 0) {
    return <p className="mt-3 rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">No classes on {DAY_NAMES[wd]}.</p>;
  }
  return (
    <div className="mt-3 space-y-3">
      {items.map(({ slot, option }) => (
        <ClassCard key={slot.id} slot={slot} option={option!} date={date} record={findRecord(records, date, slot.id)} compact />
      ))}
    </div>
  );
}

function Ring({ pct, target }: { pct: number | null; target: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const v = pct ?? 0;
  const ok = pct !== null && pct >= target;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0 -rotate-90">
      <circle cx="40" cy="40" r={r} className="stroke-muted" strokeWidth="9" fill="none" />
      <circle
        cx="40"
        cy="40"
        r={r}
        className={cn(pct === null ? "stroke-muted" : ok ? "stroke-success" : "stroke-destructive")}
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * v) / 100}
        style={{ transition: "stroke-dashoffset .6s ease" }}
      />
    </svg>
  );
}
