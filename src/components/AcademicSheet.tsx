import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppState, upsertAcademic, deleteAcademic } from "@/lib/store";
import {
  EXAM_TYPES,
  EVENT_TYPES,
  newId,
  occurrencesFor,
  type AcademicEvent,
  type Cancellation,
  type Exam,
  type Holiday,
  type Leave,
  type Occurrence,
  type Reschedule,
} from "@/lib/academic";
import { fmtTime, SUBJECT_NAMES } from "@/lib/timetable";

export type SheetKind = "holiday" | "leave" | "cancel" | "reschedule" | "exam" | "event";

export const SHEET_TITLES: Record<SheetKind, string> = {
  holiday: "🎉 Mark holiday",
  leave: "🏖️ Add leave",
  cancel: "❌ Cancel class",
  reschedule: "🔄 Reschedule class",
  exam: "📝 Add exam",
  event: "📅 Add academic event",
};

/* ---------- primitives ---------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-primary";

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-4 pb-8 safe-bottom">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Actions({ onClose, onDelete, saveLabel = "Save" }: { onClose: () => void; onDelete?: (() => void) | undefined; saveLabel?: string }) {
  return (
    <div className="mt-5 flex gap-2">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="tap-lg flex-1 rounded-2xl border-2 border-destructive/40 text-base font-bold text-destructive"
        >
          Delete
        </button>
      )}
      <button type="button" onClick={onClose} className="tap-lg flex-1 rounded-2xl bg-muted text-base font-bold">
        Cancel
      </button>
      <button type="submit" className="tap-lg flex-[2] rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-fab">
        {saveLabel}
      </button>
    </div>
  );
}

const SUBJECT_CODES = Object.keys(SUBJECT_NAMES);

/* ---------- sheet ---------- */

export interface AcademicSheetProps {
  kind: SheetKind;
  date: string;
  /** existing entry being edited */
  editing?: { id: string } | undefined;
  onClose: () => void;
}

export function AcademicSheet({ kind, date, editing, onClose }: AcademicSheetProps) {
  const state = useAppState();
  const { academic, settings, timetable } = state;

  const occurrences = (d: string): Occurrence[] =>
    occurrencesFor(d, timetable, settings.group, academic).filter((o) => o.origin === "timetable");

  const done = (msg: string) => {
    toast.success(msg);
    onClose();
  };

  const remove = (key: Parameters<typeof deleteAcademic>[0], id: string, label: string) => {
    const undo = deleteAcademic(key, id);
    toast(`${label} removed`, { action: { label: "Undo", onClick: undo } });
    onClose();
  };

  return (
    <Sheet title={SHEET_TITLES[kind]} onClose={onClose}>
      {kind === "holiday" && (
        <HolidayForm
          date={date}
          initial={academic.holidays.find((h) => h.id === editing?.id)}
          onSave={(h) => {
            upsertAcademic("holidays", h);
            done("Holiday saved");
          }}
          onDelete={editing ? () => remove("holidays", editing.id, "Holiday") : undefined}
          onClose={onClose}
        />
      )}
      {kind === "leave" && (
        <LeaveForm
          date={date}
          occurrences={occurrences}
          initial={academic.leaves.find((l) => l.id === editing?.id)}
          onSave={(l) => {
            upsertAcademic("leaves", l);
            done("Leave saved");
          }}
          onDelete={editing ? () => remove("leaves", editing.id, "Leave") : undefined}
          onClose={onClose}
        />
      )}
      {kind === "cancel" && (
        <CancelForm
          date={date}
          occurrences={occurrences}
          initial={academic.cancellations.find((c) => c.id === editing?.id)}
          onSave={(c) => {
            upsertAcademic("cancellations", c);
            done("Class cancelled");
          }}
          onDelete={editing ? () => remove("cancellations", editing.id, "Cancellation") : undefined}
          onClose={onClose}
        />
      )}
      {kind === "reschedule" && (
        <RescheduleForm
          date={date}
          occurrences={occurrences}
          initial={academic.reschedules.find((r) => r.id === editing?.id)}
          onSave={(r) => {
            upsertAcademic("reschedules", r);
            done("Class rescheduled");
          }}
          onDelete={editing ? () => remove("reschedules", editing.id, "Reschedule") : undefined}
          onClose={onClose}
        />
      )}
      {kind === "exam" && (
        <ExamForm
          date={date}
          room={settings.classroom}
          initial={academic.exams.find((e) => e.id === editing?.id)}
          onSave={(e) => {
            upsertAcademic("exams", e);
            done("Exam saved");
          }}
          onDelete={editing ? () => remove("exams", editing.id, "Exam") : undefined}
          onClose={onClose}
        />
      )}
      {kind === "event" && (
        <EventForm
          date={date}
          initial={academic.events.find((e) => e.id === editing?.id)}
          onSave={(e) => {
            upsertAcademic("events", e);
            done("Event saved");
          }}
          onDelete={editing ? () => remove("events", editing.id, "Event") : undefined}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

/* ---------- forms ---------- */

function HolidayForm({
  date,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  initial?: Holiday | undefined;
  onSave: (h: Holiday) => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(initial?.date ?? date);
  const [to, setTo] = useState(initial?.endDate ?? date);
  const [name, setName] = useState(initial?.name ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: initial?.id ?? newId("h"),
          date: from,
          endDate: to < from ? from : to,
          name: name.trim() || "Institute Holiday",
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="From"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <Field label="Holiday name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali / Institute Holiday" list="holiday-presets" />
      </Field>
      <datalist id="holiday-presets">
        {["Independence Day", "Diwali", "Institute Holiday", "Unexpected Holiday", "Weather / Local Holiday"].map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
      <Field label="Description (optional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Actions onClose={onClose} onDelete={onDelete} />
    </form>
  );
}

function SlotPicker({
  value,
  onChange,
  occs,
  allowAll,
}: {
  value: string;
  onChange: (v: string) => void;
  occs: Occurrence[];
  allowAll?: boolean;
}) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowAll && <option value="">Full day</option>}
      {occs.length === 0 && <option value="">No classes scheduled</option>}
      {occs.map((o) => (
        <option key={o.key} value={o.key}>
          {fmtTime(o.start)} · {o.code} · {o.teacher}
        </option>
      ))}
    </select>
  );
}

function LeaveForm({
  date,
  occurrences,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  occurrences: (d: string) => Occurrence[];
  initial?: Leave | undefined;
  onSave: (l: Leave) => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"day" | "class">(initial?.slotId ? "class" : "day");
  const [from, setFrom] = useState(initial?.date ?? date);
  const [to, setTo] = useState(initial?.endDate ?? date);
  const occs = occurrences(from);
  const [slotId, setSlotId] = useState(initial?.slotId ?? occs[0]?.key ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const picked = occs.find((o) => o.key === slotId);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: initial?.id ?? newId("l"),
          date: from,
          endDate: mode === "class" ? from : to < from ? from : to,
          ...(mode === "class" && slotId ? { slotId, code: picked?.code ?? "" } : {}),
          reason: reason.trim() || "Leave",
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
        {(["day", "class"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn("h-11 rounded-full text-sm font-bold", mode === m ? "bg-card shadow-card" : "text-muted-foreground")}
          >
            {m === "day" ? "Full day / range" : "Single class"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        {mode === "day" ? (
          <Field label="To"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        ) : (
          <Field label="Class"><SlotPicker value={slotId} onChange={setSlotId} occs={occs} /></Field>
        )}
      </div>
      <Field label="Reason">
        <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Medical / Personal / Planned" />
      </Field>
      <Field label="Notes (optional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Actions onClose={onClose} onDelete={onDelete} />
    </form>
  );
}

function CancelForm({
  date,
  occurrences,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  occurrences: (d: string) => Occurrence[];
  initial?: Cancellation | undefined;
  onSave: (c: Cancellation) => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
}) {
  const [d, setD] = useState(initial?.date ?? date);
  const occs = occurrences(d);
  const [slotId, setSlotId] = useState(initial?.slotId ?? occs[0]?.key ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const picked = occs.find((o) => o.key === slotId);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!slotId || !picked) {
          toast.error("Pick a class to cancel");
          return;
        }
        onSave({
          id: initial?.id ?? newId("c"),
          date: d,
          slotId,
          code: picked.code,
          teacher: picked.teacher,
          start: picked.start,
          end: picked.end,
          reason: reason.trim() || "Cancelled by faculty",
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      }}
    >
      <Field label="Date"><input type="date" className={inputCls} value={d} onChange={(e) => { setD(e.target.value); setSlotId(""); }} /></Field>
      <Field label="Class"><SlotPicker value={slotId} onChange={setSlotId} occs={occs} /></Field>
      {picked && (
        <p className="rounded-2xl bg-muted p-3 text-sm font-semibold">
          {picked.code} · {picked.teacher} · {fmtTime(picked.start)}–{fmtTime(picked.end)}
        </p>
      )}
      <Field label="Reason">
        <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Faculty unavailable" />
      </Field>
      <Field label="Notes (optional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <p className="text-xs text-muted-foreground">Only this class is cancelled — the rest of the day is unaffected.</p>
      <Actions onClose={onClose} onDelete={onDelete} saveLabel="Cancel class" />
    </form>
  );
}

function RescheduleForm({
  date,
  occurrences,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  occurrences: (d: string) => Occurrence[];
  initial?: Reschedule | undefined;
  onSave: (r: Reschedule) => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
}) {
  const [fromDate, setFromDate] = useState(initial?.fromDate ?? date);
  const occs = occurrences(fromDate);
  const [slotId, setSlotId] = useState(initial?.slotId ?? occs[0]?.key ?? "");
  const [toDate, setToDate] = useState(initial?.toDate ?? date);
  const [start, setStart] = useState(initial?.start ?? "16:00");
  const [end, setEnd] = useState(initial?.end ?? "17:00");
  const [room, setRoom] = useState(initial?.room ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const picked = occs.find((o) => o.key === slotId);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!picked) {
          toast.error("Pick the original class");
          return;
        }
        onSave({
          id: initial?.id ?? newId("rs"),
          fromDate,
          slotId,
          code: picked.code,
          teacher: picked.teacher,
          fromStart: picked.start,
          toDate,
          start,
          end,
          ...(room.trim() ? { room: room.trim() } : {}),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      }}
    >
      <Field label="Original date"><input type="date" className={inputCls} value={fromDate} onChange={(e) => { setFromDate(e.target.value); setSlotId(""); }} /></Field>
      <Field label="Original class"><SlotPicker value={slotId} onChange={setSlotId} occs={occs} /></Field>
      <Field label="New date"><input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="New start"><input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="New end"><input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Room (optional)"><input className={inputCls} value={room} onChange={(e) => setRoom(e.target.value)} /></Field>
      <Field label="Reason (optional)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Actions onClose={onClose} onDelete={onDelete} />
    </form>
  );
}

function ExamForm({
  date,
  room: defaultRoom,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  room: string;
  initial?: Exam | undefined;
  onSave: (e: Exam) => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<Exam["type"]>(initial?.type ?? "Mid Semester Exam");
  const [code, setCode] = useState(initial?.code ?? SUBJECT_CODES[0] ?? "");
  const [d, setD] = useState(initial?.date ?? date);
  const [start, setStart] = useState(initial?.start ?? "10:00");
  const [end, setEnd] = useState(initial?.end ?? "12:00");
  const [room, setRoom] = useState(initial?.room ?? defaultRoom);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: initial?.id ?? newId("x"),
          name: name.trim() || type,
          type,
          code,
          date: d,
          start,
          end,
          ...(room.trim() ? { room: room.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          completed,
        });
      }}
    >
      <Field label="Exam type">
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as Exam["type"])}>
          {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Exam name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={type} /></Field>
      <Field label="Subject">
        <select className={inputCls} value={code} onChange={(e) => setCode(e.target.value)}>
          {SUBJECT_CODES.map((c) => <option key={c} value={c}>{c} · {SUBJECT_NAMES[c]}</option>)}
        </select>
      </Field>
      <Field label="Date"><input type="date" className={inputCls} value={d} onChange={(e) => setD(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start"><input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="End"><input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Room"><input className={inputCls} value={room} onChange={(e) => setRoom(e.target.value)} /></Field>
      <Field label="Syllabus / notes (optional)"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <button
        type="button"
        onClick={() => setCompleted((c) => !c)}
        className={cn("tap-lg w-full rounded-2xl text-sm font-bold", completed ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}
      >
        {completed ? "✅ Marked completed" : "Mark completed"}
      </button>
      <Actions onClose={onClose} onDelete={onDelete} />
    </form>
  );
}

function EventForm({
  date,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  date: string;
  initial?: AcademicEvent | undefined;
  onSave: (e: AcademicEvent) => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AcademicEvent["type"]>(initial?.type ?? "Academic");
  const [from, setFrom] = useState(initial?.date ?? date);
  const [to, setTo] = useState(initial?.endDate ?? date);
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: initial?.id ?? newId("e"),
          name: name.trim() || type,
          type,
          date: from,
          endDate: to < from ? from : to,
          ...(start ? { start } : {}),
          ...(end ? { end } : {}),
          ...(code ? { code } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
        });
      }}
    >
      <Field label="Event name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Assignment deadline" /></Field>
      <Field label="Type">
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as AcademicEvent["type"])}>
          {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start (optional)"><input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="End (optional)"><input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Subject (optional)">
        <select className={inputCls} value={code} onChange={(e) => setCode(e.target.value)}>
          <option value="">None</option>
          {SUBJECT_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Description (optional)"><textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Actions onClose={onClose} onDelete={onDelete} />
    </form>
  );
}
