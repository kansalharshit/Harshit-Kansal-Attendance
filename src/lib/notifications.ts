import { getState } from "./store";
import { getISTNow } from "./time";
import { resolveSlot, slotsForDay, toMinutes, fmtTime } from "./timetable";

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

const LEAD_MINUTES = 5;
const fired = new Set<string>();

function show(title: string, body: string, tag: string) {
  try {
    new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
  } catch {
    /* some Android browsers require SW-based notifications; ignore silently */
  }
}

/** Checks each minute; fires a reminder 5 minutes before class and at class start. Only while app is open and permitted. */
export function startNotificationScheduler(): () => void {
  const tick = () => {
    const { settings, timetable } = getState();
    if (!settings.notifications || notificationPermission() !== "granted") return;
    const now = getISTNow();
    for (const slot of slotsForDay(timetable, now.weekday)) {
      const opt = resolveSlot(slot, settings.group);
      if (!opt) continue;
      const start = toMinutes(slot.start);
      const keyBefore = `${now.date}|${slot.id}|before`;
      const keyStart = `${now.date}|${slot.id}|start`;
      if (now.minutes === start - LEAD_MINUTES && !fired.has(keyBefore)) {
        fired.add(keyBefore);
        show(`${opt.code} in ${LEAD_MINUTES} min`, `${opt.teacher} · ${fmtTime(slot.start)}–${fmtTime(slot.end)}`, keyBefore);
      }
      if (now.minutes === start && !fired.has(keyStart)) {
        fired.add(keyStart);
        show(`${opt.code} started`, `Tap to mark yourself present`, keyStart);
      }
    }
  };
  tick();
  const id = setInterval(tick, 30_000);
  return () => clearInterval(id);
}
