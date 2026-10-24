/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail loudly rather than silently moving to another port, which would
    // break any origin allowlist that names this exact port.
    strictPort: true,

    // Listen on every interface, not just 127.0.0.1, so a forwarded port or
    // another device on the LAN can reach the dev server at all.
    host: true,

    // Vite rejects requests whose Host header it does not recognise (a
    // DNS-rebinding guard). A forwarded port arrives under the tunnel's own
    // hostname, so those domains have to be allowed explicitly. Dev server
    // only — this has no effect on a production build.
    allowedHosts: [
      ".devtunnels.ms", // VS Code / Visual Studio port forwarding
      ".ngrok-free.app",
      ".ngrok.io",
      ".trycloudflare.com",
      ".loca.lt",
    ],

    proxy: {
      // The browser talks to the SAME origin it loaded the page from, and Vite
      // forwards to the API process-side. This is what makes port forwarding
      // work: only port 5173 needs to be exposed, the tunnel's hostname never
      // has to be hard-coded anywhere, and there is no cross-origin request,
      // so CORS stops being involved at all.
      //
      // Target is 127.0.0.1, not "localhost": on Windows, Node resolves
      // "localhost" to ::1 first, while Uvicorn binds IPv4 only — which fails
      // with ECONNREFUSED that looks exactly like "the backend is down".
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
