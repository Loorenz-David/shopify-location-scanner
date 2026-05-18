import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
function injectSwBuildVersion() {
    const version = Date.now().toString();
    return {
        name: "inject-sw-build-version",
        apply: "build",
        closeBundle() {
            const swPath = join("dist", "service-worker.js");
            const content = readFileSync(swPath, "utf-8");
            writeFileSync(swPath, content.replace('"__SW_BUILD_VERSION__"', `"${version}"`));
        },
    };
}
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), svgr(), injectSwBuildVersion()],
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
