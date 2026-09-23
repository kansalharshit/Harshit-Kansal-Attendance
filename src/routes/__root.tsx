import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { BottomNav } from "../components/BottomNav";
import { useAppState } from "../lib/store";
import { setupPWA } from "../lib/pwa";
import { startNotificationScheduler } from "../lib/notifications";

const THEME_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("nit-self-attendance:v1")||"{}");var t=s.settings&&s.settings.theme||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "author", content: "Harshit Kansal" },
      { name: "theme-color", content: "#07152d" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Attendance" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
    ],
    scripts: [{ children: THEME_SCRIPT }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ThemeAndServices() {
  const theme = useAppState().settings.theme;
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    void setupPWA();
    return startNotificationScheduler();
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeAndServices />
      <div className="app-shell">
        <aside className="desktop-sidebar">
          <Link to="/" className="brand-block">
            <span className="brand-mark">HK</span>
            <span><strong>Harshit Kansal</strong><small>Self Attendance</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "nav-item active" }} className="nav-item">Home</Link>
            <Link to="/timetable" activeProps={{ className: "nav-item active" }} className="nav-item">My Timetable</Link>
            <Link to="/attendance" activeProps={{ className: "nav-item active" }} className="nav-item">My Attendance</Link>
            <Link to="/settings" activeProps={{ className: "nav-item active" }} className="nav-item">Settings</Link>
          </nav>
          <div className="sidebar-profile">
            <div className="profile-avatar">HK</div>
            <div><strong>Harshit Kansal</strong><span>NIT Hamirpur</span><span>B.Tech CSE Dual Degree</span></div>
          </div>
        </aside>
        <div className="app-main">
          <header className="topbar">
            <div><p className="eyebrow">NIT HAMIRPUR · PERSONAL DASHBOARD</p><h1>Harshit Kansal's Attendance</h1><p>Track · Manage · Stay on Schedule</p></div>
            <div className="topbar-user"><span className="profile-avatar small">HK</span><span>Harshit Kansal</span></div>
          </header>
          <main className="page-content"><Outlet /></main>
        </div>
      </div>
      <BottomNav />
      <Toaster position="bottom-center" offset={88} mobileOffset={{ bottom: 88 }} richColors duration={4000} />
    </QueryClientProvider>
  );
}
