import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Upload, RotateCcw, Trash2, Moon, Sun, MonitorSmartphone, Bell, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearAllAttendance,
  mergeRecords,
  replaceState,
  resetTimetable,
  updateSettings,
  useAppState,
  type Theme,
} from "@/lib/store";
import { exportCSV, exportJSON, parseImportFile } from "@/lib/export-import";
import { notificationPermission, notificationsSupported, requestNotificationPermission } from "@/lib/notifications";
import type { Group } from "@/lib/timetable";
import { cn } from "@/lib/utils";

const TITLE = "Settings — Harshit Kansal's Attendance";
const DESC = "Set your name, section, classroom, group, attendance target, theme, reminders and manage backups.";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, records } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<"timetable" | "attendance" | null>(null);
  const [permDenied, setPermDenied] = useState(false);

  useEffect(() => {
    setPermDenied(notificationPermission() === "denied");
  }, [settings.notifications]);

  const onImport = async (file: File) => {
    const res = await parseImportFile(file);
    if (res.kind === "error") {
      toast.error(res.message);
    } else if (res.kind === "json") {
      replaceState(res.state);
      toast.success(`Restored backup · ${res.state.records.length} records`);
    } else {
      mergeRecords(res.records);
      toast.success(`Imported ${res.records.length} records`);
    }
  };

  const toggleNotifications = async (on: boolean) => {
    if (!on) {
      updateSettings({ notifications: false });
      return;
    }
    if (!notificationsSupported()) {
      toast.error("Notifications aren't supported in this browser");
      return;
    }
    const p = await requestNotificationPermission();
    if (p === "granted") {
      updateSettings({ notifications: true });
      toast.success("Reminders on · 5 min before each class");
    } else {
      updateSettings({ notifications: false });
      toast.error("Permission not granted");
    }
  };

  return (
    <main className="px-4 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      <Section title="Profile">
        <Field label="Name">
          <Input value={settings.name} placeholder="Your name" onChange={(e) => updateSettings({ name: e.target.value })} className="h-12 text-base" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section">
            <Input value={settings.section} onChange={(e) => updateSettings({ section: e.target.value })} className="h-12 text-base" />
          </Field>
          <Field label="Classroom">
            <Input value={settings.classroom} onChange={(e) => updateSettings({ classroom: e.target.value })} className="h-12 text-base" />
          </Field>
        </div>
        <Field label="Your group (for split slots)">
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as Group[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => updateSettings({ group: g })}
                className={cn(
                  "h-12 rounded-2xl text-sm font-extrabold transition-colors",
                  settings.group === g ? "bg-primary text-primary-foreground shadow-fab" : "bg-muted text-muted-foreground",
                )}
              >
                Group {g}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`Attendance target · ${settings.target}%`}>
          <input
            type="range"
            min={50}
            max={100}
            step={1}
            value={settings.target}
            onChange={(e) => updateSettings({ target: Number(e.target.value) })}
            className="h-12 w-full accent-primary"
          />
        </Field>
      </Section>

      <Section title="Appearance">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
              ["system", "Auto", MonitorSmartphone],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => updateSettings({ theme: v as Theme })}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold",
                settings.theme === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Reminders">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Bell className="size-5" />
            </div>
            <div>
              <p className="font-bold">Class notifications</p>
              <p className="text-xs text-muted-foreground">
                {permDenied
                  ? "Blocked in browser settings"
                  : "5 minutes before class, while the app is open"}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notifications}
            aria-label="Class notifications"
            onClick={() => void toggleNotifications(!settings.notifications)}
            className={cn(
              "relative h-8 w-14 shrink-0 rounded-full transition-colors",
              settings.notifications ? "bg-primary" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-6 rounded-full bg-card shadow-card transition-transform",
                settings.notifications ? "translate-x-7" : "translate-x-1",
              )}
            />
          </button>
        </div>
      </Section>

      <Section title="Backup & data">
        <p className="text-xs text-muted-foreground">
          Everything is stored on this device only · {records.length} attendance records
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton icon={FileJson} label="Export JSON" onClick={exportJSON} />
          <ActionButton icon={FileSpreadsheet} label="Export CSV" onClick={exportCSV} />
        </div>
        <ActionButton icon={Upload} label="Import JSON or CSV" onClick={() => fileRef.current?.click()} wide />
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
        <ActionButton icon={Download} label="Install: use browser menu → Add to Home screen" muted wide />
      </Section>

      <Section title="Danger zone">
        {confirm ? (
          <div className="rounded-2xl bg-danger-soft p-4">
            <p className="text-sm font-bold text-destructive">
              {confirm === "timetable" ? "Reset timetable to the Section D default?" : "Delete all attendance records?"}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm === "timetable") resetTimetable();
                  else clearAllAttendance();
                  toast.success(confirm === "timetable" ? "Timetable reset" : "Attendance cleared");
                  setConfirm(null);
                }}
                className="h-12 flex-1 rounded-2xl bg-destructive font-extrabold text-destructive-foreground"
              >
                Yes, do it
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="h-12 flex-1 rounded-2xl bg-card font-bold">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <ActionButton icon={RotateCcw} label="Reset timetable" onClick={() => setConfirm("timetable")} />
            <ActionButton icon={Trash2} label="Clear attendance" onClick={() => setConfirm("attendance")} danger />
          </div>
        )}
      </Section>

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        Harshit Kansal's Attendance · NIT Hamirpur · Offline, private, no account
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="surface-card space-y-4 p-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger,
  muted,
  wide,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  muted?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold active:scale-[0.98]",
        danger ? "bg-danger-soft text-destructive" : muted ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground",
        wide && "w-full",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
