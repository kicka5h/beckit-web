import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Matches --page-color in src/theme/tokens.css; the manifest can't read CSS variables.
const PAGE_COLOR = "#1c1b19";

export default defineConfig({
  plugins: [
    react(),
    // The service worker precaches the whole app (scripts, styles, fonts, the Automerge engine),
    // so after one online visit the URL opens and works with no network.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Beckit",
        short_name: "Beckit",
        description: "Write anywhere. Every version of every paragraph, kept.",
        display: "standalone",
        background_color: PAGE_COLOR,
        theme_color: PAGE_COLOR,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,wasm}"],
        // The Automerge engine alone is a few megabytes; the default 2 MB cap would leave it out.
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        // Firebase serves its sign-in pages under /__/; the app shell must never stand in for them.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
});
