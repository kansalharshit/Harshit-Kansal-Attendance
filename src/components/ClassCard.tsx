import { Check, X, RotateCcw, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { markAttendance, clearRecord, type AttendanceRecord, type Status } from "@/lib/store";
import { fmtTime, isGroupSlot, SUBJECT_NAMES, type Slot, type SlotOption } from "@/lib/timetable";

export interface ClassCardProps {
  slot: Slot;
  option: SlotOption;
  date: string;
  record?: AttendanceRecord | undefined;
  /** "live" = currently running, "past", "upcoming" */
  phase?: "live" | "past" | "upcoming" | undefined;
  countdown?: string | undefined;
  /** Allow marking (today or past dates). */
  canMark?: boolean;
  compact?: boolean;
}

export function ClassCard({ slot, option, date, record, phase, countdown, canMark = true, compact }: ClassCardProps) {
  const mark = (status: Status) => {
    const undo = markAttendance({ date, slotId: slot.id, code: option.code, teacher: option.teacher, status });
    toast(status === "present" ? `Marked present · ${option.code}` : `Marked absent · ${option.code}`, {
      action: { label: "Undo", onClick: undo },
    });
  };
  const clear = () => {
    const undo = clearRecord(date, slot.id);
    toast(`Cleared ${option.code}`, { action: { label: "Undo", onClick: undo } });
  };

  const name = SUBJECT_NAMES[option.code];

  return (
    <div
      className={cn(
        "surface-card overflow-hidden",
        phase === "live" && "ring-2 ring-primary",
        record?.status === "present" && "bg-success-soft/60",
        record?.status === "absent" && "bg-danger-soft/60",
      )}
    >
      <div className={cn("flex items-start gap-3 p-4", compact && "p-3")}>
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-secondary py-2 text-secondary-foreground">
          <span className="text-sm font-extrabold tabular">{fmtTime(slot.start).replace(/ (AM|PM)/, "")}</span>
          <span className="text-[10px] font-semibold uppercase opacity-70">{fmtTime(slot.start).slice(-2)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-extrabold leading-tight">{option.code}</h3>
            {option.label && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                {option.label}
              </span>
            )}
            {isGroupSlot(slot) && option.group && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                <Users className="size-3" /> Gr.{option.group}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {name ? `${name} · ` : ""}
            {option.teacher}
          </p>
          <p className="mt-1 text-xs font-semibold tabular text-muted-foreground">
            {fmtTime(slot.start)} – {fmtTime(slot.end)}
            {phase === "live" && countdown && <span className="ml-2 text-primary">ends in {countdown}</span>}
            {phase === "upcoming" && countdown && <span className="ml-2 text-primary">starts in {countdown}</span>}
          </p>
        </div>
        {record && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide",
              record.status === "present" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground",
            )}
          >
            {record.status}
          </span>
        )}
      </div>

      {canMark && (
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
