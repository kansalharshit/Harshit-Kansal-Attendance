import { Link } from "@tanstack/react-router";
import { Home, CalendarDays, BarChart3, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/attendance", label: "Attendance", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-bottom"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary", "aria-current": "page" }}
              activeOptions={{ exact: to === "/" }}
            >
              <span className="flex h-8 w-16 items-center justify-center rounded-full transition-colors group-[[aria-current=page]]:bg-secondary">
                <Icon className="size-5" strokeWidth={2.25} />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
