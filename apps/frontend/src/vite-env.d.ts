/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SCANNER_QR_ENGINE: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_STOCK_API_MODE: "mock" | "live";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
