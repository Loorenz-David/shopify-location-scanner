import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@zxing/browser")) {
            return "scanner-vendor";
          }

          if (id.includes("recharts")) {
            return "analytics-vendor";
          }

          if (id.includes("react-konva") || id.includes("/konva/")) {
            return "map-vendor";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5176,
    strictPort: true,
    allowedHosts: [".ngrok-free.app"],
  },
});
