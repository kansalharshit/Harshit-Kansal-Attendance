import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    tailwindcss(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false,
      filename: "sw.js",
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["**/*.{js,css,woff2,png,svg,ico,webmanifest}"],
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/~oauth/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: { cacheName: "pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 20 } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: { cacheName: "assets", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
        ],
      },
    }),
  ],
});
