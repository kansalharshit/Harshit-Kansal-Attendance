import { Check, X, RotateCcw, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { markAttendance, clearRecord, type AttendanceRecord, type Status } from "@/lib/store";
import { fmtTime, SUBJECT_NAMES } from "@/lib/timetable";
import { STATUS_ICON, type Occurrence } from "@/lib/academic";
import { formatShortDate } from "@/lib/time";

const STATUS_TEXT: Record<string, string> = {
  holiday: "Holiday",
  cancelled: "Cancelled",
  leave: "Leave",
  moved: "Rescheduled",
};

export function OccurrenceCard({
  occ,
  date,
  record,
  phase,
  countdown,
  canMark = true,
  compact,
}: {
  occ: Occurrence;
  date: string;
  record?: AttendanceRecord | undefined;
  phase?: "live" | "past" | "upcoming" | undefined;
  countdown?: string | undefined;
  canMark?: boolean;
  compact?: boolean;
}) {
  const mark = (status: Status) => {
    const undo = markAttendance({ date, slotId: occ.key, code: occ.code, teacher: occ.teacher, status });
    toast(status === "present" ? `Marked present · ${occ.code}` : `Marked absent · ${occ.code}`, {
      action: { label: "Undo", onClick: undo },
    });
  };
  const clear = () => {
    const undo = clearRecord(date, occ.key);
    toast(`Cleared ${occ.code}`, { action: { label: "Undo", onClick: undo } });
  };

  const name = SUBJECT_NAMES[occ.code];
  const blocked = !occ.countable;

  return (
    <div
      className={cn(
        "surface-card overflow-hidden",
        phase === "live" && occ.countable && "ring-2 ring-primary",
        blocked && "opacity-90",
        !blocked && record?.status === "present" && "bg-success-soft/60",
        !blocked && record?.status === "absent" && "bg-danger-soft/60",
      )}
    >
      <div className={cn("flex items-start gap-3 p-4", compact && "p-3")}>
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-secondary py-2 text-secondary-foreground">
          <span className="text-sm font-extrabold tabular">{fmtTime(occ.start).replace(/ (AM|PM)/, "")}</span>
          <span className="text-[10px] font-semibold uppercase opacity-70">{fmtTime(occ.start).slice(-2)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("truncate text-lg font-extrabold leading-tight", blocked && "line-through opacity-70")}>
              {occ.code}
            </h3>
            {occ.label && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                {occ.label}
              </span>
            )}
            {occ.group && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                <Users className="size-3" /> Gr.{occ.group}
              </span>
            )}
            {blocked && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-extrabold uppercase text-muted-foreground">
                {STATUS_ICON[occ.status]} {STATUS_TEXT[occ.status]}
              </span>
            )}
            {occ.origin === "reschedule" && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                🔄 Rescheduled here
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {name ? `${name} · ` : ""}
            {occ.teacher}
            {occ.room ? ` · Room ${occ.room}` : ""}
          </p>
          <p className="mt-1 text-xs font-semibold tabular text-muted-foreground">
            {fmtTime(occ.start)} – {fmtTime(occ.end)}
            {phase === "live" && countdown && <span className="ml-2 text-primary">ends in {countdown}</span>}
            {phase === "upcoming" && countdown && <span className="ml-2 text-primary">starts in {countdown}</span>}
          </p>
          {occ.movedTo && (
            <p className="mt-1 text-xs font-semibold text-accent-foreground">
              Moved to {formatShortDate(occ.movedTo.date)} {fmtTime(occ.movedTo.start)}
            </p>
          )}
          {occ.movedFrom && (
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Originally {formatShortDate(occ.movedFrom.date)} {fmtTime(occ.movedFrom.start)}
            </p>
          )}
          {occ.reason && <p className="mt-1 text-xs text-muted-foreground">{occ.reason}</p>}
        </div>
        {!blocked && record && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide",
              record.status === "present"
                ? "bg-success text-success-foreground"
                : "bg-destructive text-destructive-foreground",
            )}
          >
            {record.status}
          </span>
        )}
      </div>

      {canMark && !blocked && (
        <div className="flex gap-2 px-4 pb-4">
          {record ? (
            <>
              <button
                type="button"
                onClick={() => mark(record.status === "present" ? "absent" : "present")}
                className="tap-lg flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-bold text-secondary-foreground active:scale-[0.98]"
              >
                {record.status === "present" ? <X className="size-4" /> : <Check className="size-4" />}
                Change to {record.status === "present" ? "Absent" : "Present"}
              </button>
              <button
                type="button"
                onClick={clear}
                aria-label="Undo mark"
                className="tap-lg flex w-14 items-center justify-center rounded-2xl border border-border bg-card text-foreground active:scale-[0.98]"
              >
                <RotateCcw className="size-5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => mark("present")}
                className="tap-lg flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-fab active:scale-[0.98]"
              >
                <Check className="size-5" strokeWidth={3} /> Present
              </button>
              <button
                type="button"
                onClick={() => mark("absent")}
                className="tap-lg flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-destructive/40 bg-card text-base font-bold text-destructive active:scale-[0.98]"
              >
                <X className="size-5" strokeWidth={3} /> Absent
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
