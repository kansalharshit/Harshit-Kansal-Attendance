/**
 * The only place the app-shell service worker is registered.
 * Registers the app-shell service worker only in a production top-level page.
 */
const SW_URL = "/sw.js";

function isBlockedContext(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL ?? r.waiting?.scriptURL ?? r.installing?.scriptURL ?? "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export async function setupPWA() {
  if (isBlockedContext()) {
    await unregisterAppWorkers();
    return;
  }
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    /* offline support unavailable */
  }
}
