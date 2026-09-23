import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, GraduationCap, RefreshCw, Sparkles } from "lucide-react";
import { ClassCard } from "@/components/ClassCard";
import { findRecord, useAppState } from "@/lib/store";
import { computeStreak, overall, subjectStats } from "@/lib/stats";
import { formatClock, formatLongDate, useISTNow } from "@/lib/time";
import { resolveSlot, slotsForDay, toMinutes } from "@/lib/timetable";

const TITLE = "Harshit Kansal's Attendance";
const DESC = "Personal NIT Hamirpur attendance dashboard for Harshit Kansal.";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }] }),
  component: Home,
});

function Home() {
  const state = useAppState();
  const now = useISTNow();
  const { settings, timetable, records, academic } = state;
  const today = now?.date ?? "";
  const todaySlots = now
    ? slotsForDay(timetable, now.weekday)
        .map((slot) => ({ slot, option: resolveSlot(slot, settings.group) }))
        .filter((x): x is { slot: (typeof x)["slot"]; option: NonNullable<(typeof x)["option"]> } => x.option !== null)
    : [];
  const nowSec = now ? now.minutes * 60 + now.seconds : 0;
  const live = todaySlots.find(({ slot }) => nowSec >= toMinutes(slot.start) * 60 && nowSec < toMinutes(slot.end) * 60);
  const ov = overall(records, academic);
  const streak = now ? computeStreak(records, timetable, settings.group, today, academic) : 0;
  const warnings = subjectStats(records, timetable, settings.group, settings.target, academic, today).filter((s) => s.belowTarget);
  const unmarked = todaySlots.filter(({ slot }) => !findRecord(records, today, slot.id) && now && toMinutes(slot.end) * 60 <= nowSec).length;
  const recent = [...records].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4);

  return (
    <div className="px-4 pt-6 md:px-0 md:pt-0">
      <div className="dashboard-grid">
        <section className="dashboard-main">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{now ? formatLongDate(today) : "Loading…"}</p>
              <h2 className="hero-title mt-1">Good {now && now.hour < 12 ? "Morning" : now && now.hour < 17 ? "Afternoon" : "Evening"}, Harshit! 👋</h2>
              <p className="mt-2 text-sm text-muted-foreground">Here&apos;s your class schedule and attendance at a glance.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">India Standard Time</p>
              <p className="mt-1 text-lg font-extrabold tabular">{now ? formatClock(now) : "--:--:--"}</p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="stat-panel"><p className="text-xs font-bold text-muted-foreground">OVERALL ATTENDANCE</p><p className="stat-number mt-2">{ov.pct == null ? "—" : `${ov.pct.toFixed(1)}%`}</p><p className="mt-1 text-xs text-muted-foreground">{ov.present}/{ov.total || 0} classes</p></div>
            <div className="stat-panel"><p className="text-xs font-bold text-muted-foreground">CURRENT STREAK</p><p className="stat-number mt-2">{streak}</p><p className="mt-1 text-xs text-muted-foreground">{streak === 1 ? "day" : "days"} without an absence</p></div>
            <div className="stat-panel"><p className="text-xs font-bold text-muted-foreground">TARGET</p><p className="stat-number mt-2">{settings.target}%</p><p className="mt-1 text-xs text-muted-foreground">Minimum attendance goal</p></div>
          </div>

          <div className="mt-7 surface-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div><div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /><h3 className="section-title">Today&apos;s Timetable</h3></div><p className="mt-1 text-xs text-muted-foreground">{todaySlots.length} scheduled class{todaySlots.length === 1 ? "" : "es"} · {unmarked ? `${unmarked} past class${unmarked === 1 ? " is" : "es are"} unmarked` : "all caught up"}</p></div>
              <Link to="/timetable" className="inline-flex items-center gap-1 text-xs font-extrabold text-primary">Full timetable <ArrowRight className="size-3.5" /></Link>
            </div>
            <div className="mt-4 space-y-3">
              {todaySlots.length ? todaySlots.map(({ slot, option }) => {
                const record = findRecord(records, today, slot.id);
                const phase = nowSec >= toMinutes(slot.end) * 60 ? "past" : nowSec >= toMinutes(slot.start) * 60 ? "live" : "upcoming";
                return <ClassCard key={slot.id} slot={slot} option={option} date={today} record={record} phase={phase} compact />;
              }) : <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No classes scheduled today.</div>}
            </div>
          </div>

          {warnings.length > 0 && <div className="mt-5 rounded-2xl border border-amber-700/40 bg-warning-soft p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 text-warning" /><div><p className="font-extrabold">Attendance needs attention</p><p className="mt-1 text-sm text-muted-foreground">{warnings.length} subject{warnings.length === 1 ? " is" : "s are"} below your {settings.target}% target.</p><div className="mt-2 flex flex-wrap gap-2">{warnings.map((w) => <span key={w.code} className="rounded-full bg-card px-3 py-1 text-xs font-bold">{w.code} · {Math.round(w.pct ?? 0)}%</span>)}</div></div></div></div>}
        </section>

        <aside className="dashboard-side space-y-5">
          <div className="surface-card p-5">
            <Link to="/timetable" className="quick-action primary-action"><CheckCircle2 className="size-5" /> Mark Today&apos;s Attendance</Link>
            <Link to="/timetable" className="quick-action mt-3"><CalendarDays className="size-5" /> View Full Timetable</Link>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /><h3 className="section-title">Quick Actions</h3></div>
            <div className="mt-4 space-y-2.5">
              <Link to="/attendance" className="quick-action"><GraduationCap className="size-5" /> View Attendance</Link>
              <Link to="/timetable" className="quick-action"><RefreshCw className="size-5" /> Reschedule / Manage</Link>
              <Link to="/attendance" className="quick-action"><Clock3 className="size-5" /> Leave / Holiday</Link>
              <Link to="/settings" className="quick-action"><FileText className="size-5" /> Export / Settings</Link>
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between"><h3 className="section-title">Recent Activity</h3><Link to="/attendance" className="text-xs font-bold text-primary">View all</Link></div>
            <div className="mt-3">
              {recent.length ? recent.map((r) => <div className="activity-item" key={r.id}><div className="activity-dot"><CheckCircle2 className="size-4" /></div><div><p className="text-sm font-bold">{r.code} marked {r.status}</p><p className="text-xs text-muted-foreground">{new Date(r.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div></div>) : <p className="py-5 text-sm text-muted-foreground">No attendance activity yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card px-5 py-4"><p className="text-center text-xs font-bold text-muted-foreground">Discipline today = Freedom tomorrow ✨</p></div>
        </aside>
      </div>
    </div>
  );
}
