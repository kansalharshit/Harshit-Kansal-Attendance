import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, Users, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteSlot, upsertSlot, useAppState } from "@/lib/store";
import { useISTNow } from "@/lib/time";
import {
  DAY_NAMES,
  DAY_SHORT,
  fmtTime,
  isGroupSlot,
  newSlotId,
  resolveSlot,
  slotsForDay,
  SUBJECT_NAMES,
  type Group,
  type Slot,
  type SlotOption,
} from "@/lib/timetable";
import { cn } from "@/lib/utils";

const TITLE = "Timetable — Harshit Kansal's Attendance";
const DESC = "Daily and weekly class schedule for Section D, Classroom F1. Edit slots and group classes.";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: TimetablePage,
});

function TimetablePage() {
  const { timetable, settings } = useAppState();
  const now = useISTNow();
  const [view, setView] = useState<"day" | "week">("day");
  const [day, setDay] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSlot, setEditSlot] = useState<Slot | "new" | null>(null);

  const todayWeekday = now?.weekday ?? 1;
  const selectedDay = day ?? (todayWeekday >= 1 && todayWeekday <= 5 ? todayWeekday : 1);

  return (
    <main className="px-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Timetable</h1>
          <p className="text-xs font-semibold text-muted-foreground">Showing your Group {settings.group} classes</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className={cn(
            "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
            editing ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
          {editing ? "Done" : "Edit"}
        </button>
      </header>

      <div className="mt-4 grid grid-cols-2 rounded-full bg-muted p-1">
        {(["day", "week"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "h-10 rounded-full text-sm font-bold capitalize transition-colors",
              view === v ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "day" && (
        <>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-2xl text-sm font-bold transition-colors",
                  selectedDay === d ? "bg-primary text-primary-foreground shadow-fab" : "bg-card text-foreground shadow-card",
                )}
              >
                {DAY_SHORT[d]}
                {d === todayWeekday && <span className="mt-0.5 size-1.5 rounded-full bg-accent" />}
              </button>
            ))}
          </div>
          <DayList
            day={selectedDay}
            timetable={timetable}
            group={settings.group}
            editing={editing}
            onEdit={setEditSlot}
          />
        </>
      )}

      {view === "week" && (
        <div className="mt-4 space-y-5">
          {[1, 2, 3, 4, 5].map((d) => (
            <div key={d}>
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                {DAY_NAMES[d]}
                {d === todayWeekday && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">Today</span>}
              </h2>
              <DayList day={d} timetable={timetable} group={settings.group} editing={editing} onEdit={setEditSlot} dense />
            </div>
          ))}
        </div>
      )}

      {editing && (
        <button
          type="button"
          onClick={() => setEditSlot("new")}
          className="fixed bottom-24 right-5 z-30 flex h-14 items-center gap-2 rounded-full bg-primary px-5 font-extrabold text-primary-foreground shadow-fab active:scale-95"
        >
          <Plus className="size-5" strokeWidth={3} /> Add class
        </button>
      )}

      <SlotEditor
        key={editSlot === null ? "closed" : editSlot === "new" ? "new" : editSlot.id}
        slot={editSlot}
        defaultDay={selectedDay}
        onClose={() => setEditSlot(null)}
      />
    </main>
  );
}

function DayList({
  day,
  timetable,
  group,
  editing,
  onEdit,
  dense,
}: {
  day: number;
  timetable: Slot[];
  group: Group;
  editing: boolean;
  onEdit: (s: Slot) => void;
  dense?: boolean;
}) {
  const slots = slotsForDay(timetable, day);
  if (slots.length === 0) {
    return <p className="mt-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">No classes.</p>;
  }
  return (
    <ul className={cn("mt-3 space-y-2", dense && "space-y-1.5")}>
      {slots.map((slot) => {
        const mine = resolveSlot(slot, group);
        const group_ = isGroupSlot(slot);
        return (
          <li
            key={slot.id}
            className={cn(
              "surface-card flex items-center gap-3 p-3",
              !mine && "opacity-60",
            )}
          >
            <div className="w-16 shrink-0 text-xs font-bold tabular text-muted-foreground">
              <div>{fmtTime(slot.start)}</div>
              <div className="opacity-60">{fmtTime(slot.end)}</div>
            </div>
            <div className="min-w-0 flex-1">
              {mine ? (
                <>
                  <p className="flex items-center gap-2 text-base font-extrabold">
                    {mine.code}
                    {mine.label && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">{mine.label}</span>}
                    {group_ && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        <Users className="size-3" /> Gr.{mine.group}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SUBJECT_NAMES[mine.code] ? `${SUBJECT_NAMES[mine.code]} · ` : ""}
                    {mine.teacher}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-muted-foreground">Free for Group {group}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {slot.options.map((o) => `Gr.${o.group} ${o.code}`).join(" · ")}
                  </p>
                </>
              )}
              {group_ && mine && !dense && (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  Others: {slot.options.filter((o) => o !== mine).map((o) => `Gr.${o.group} ${o.code}`).join(" · ") || "—"}
                </p>
              )}
            </div>
            {editing && (
              <button
                type="button"
                onClick={() => onEdit(slot)}
                aria-label="Edit slot"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              >
                <Pencil className="size-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- editor ---------------- */

interface OptionDraft {
  code: string;
  teacher: string;
  group: "" | "1" | "2" | "3";
  label: string;
}

function SlotEditor({ slot, defaultDay, onClose }: { slot: Slot | "new" | null; defaultDay: number; onClose: () => void }) {
  const open = slot !== null;
  const existing = slot && slot !== "new" ? slot : null;
  const [day, setDay] = useState(existing?.day ?? defaultDay);
  const [start, setStart] = useState(existing?.start ?? "09:00");
  const [end, setEnd] = useState(existing?.end ?? "10:00");
  const [options, setOptions] = useState<OptionDraft[]>(
    existing?.options.map((o) => ({ code: o.code, teacher: o.teacher, group: o.group ? (String(o.group) as "1" | "2" | "3") : "", label: o.label ?? "" })) ?? [
      { code: "", teacher: "", group: "", label: "" },
    ],
  );

  const setOpt = (i: number, patch: Partial<OptionDraft>) =>
    setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  const save = () => {
    const cleaned = options.filter((o) => o.code.trim());
    if (cleaned.length === 0) {
      toast.error("Add a subject code");
      return;
    }
    if (start >= end) {
      toast.error("End time must be after start");
      return;
    }
    const groupMode = cleaned.length > 1 || cleaned.some((o) => o.group);
    if (groupMode && cleaned.some((o) => !o.group)) {
      toast.error("Pick a group for each option in a group slot");
      return;
    }
    const opts: SlotOption[] = cleaned.map((o) => ({
      code: o.code.trim().toUpperCase(),
      teacher: o.teacher.trim(),
      ...(o.group ? { group: Number(o.group) as Group } : {}),
      ...(o.label.trim() ? { label: o.label.trim() } : {}),
    }));
    upsertSlot({ id: existing?.id ?? newSlotId(), day, start, end, options: opts });
    toast.success(existing ? "Slot updated" : "Slot added");
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    deleteSlot(existing.id);
    toast("Slot deleted");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit class" : "Add class"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Day</Label>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={cn(
                    "h-11 rounded-xl text-sm font-bold",
                    day === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {DAY_SHORT[d]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Start</Label>
              <Input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1.5 h-12 text-base" />
            </div>
            <div>
              <Label htmlFor="end">End</Label>
              <Input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1.5 h-12 text-base" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Subject{options.length > 1 ? "s (group slot)" : ""}</Label>
              <button
                type="button"
                onClick={() => setOptions((o) => [...o, { code: "", teacher: "", group: "", label: "" }])}
                className="text-xs font-bold text-primary"
              >
                + Add group option
              </button>
            </div>
            {options.map((o, i) => (
              <div key={i} className="rounded-2xl bg-muted p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Code (CS-111)" value={o.code} onChange={(e) => setOpt(i, { code: e.target.value })} className="h-11 bg-card" />
                  <Input placeholder="Teacher" value={o.teacher} onChange={(e) => setOpt(i, { teacher: e.target.value })} className="h-11 bg-card" />
                  <Input placeholder="Label (Workshop)" value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} className="h-11 bg-card" />
                  <select
                    value={o.group}
                    onChange={(e) => setOpt(i, { group: e.target.value as OptionDraft["group"] })}
                    className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                  >
                    <option value="">All groups</option>
                    <option value="1">Group 1</option>
                    <option value="2">Group 2</option>
                    <option value="3">Group 3</option>
                  </select>
                </div>
                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOptions((os) => os.filter((_, j) => j !== i))}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-destructive"
                  >
                    <X className="size-3" /> Remove option
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            {existing && (
              <button
                type="button"
                onClick={remove}
                aria-label="Delete slot"
                className="flex h-12 w-14 items-center justify-center rounded-2xl border-2 border-destructive/40 text-destructive"
              >
                <Trash2 className="size-5" />
              </button>
            )}
            <button
              type="button"
              onClick={save}
              className="h-12 flex-1 rounded-2xl bg-primary text-base font-extrabold text-primary-foreground"
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
