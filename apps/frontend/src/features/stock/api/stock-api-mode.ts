export type StockApiMode = "mock" | "live";

export function resolveStockApiMode(): StockApiMode {
  return import.meta.env.VITE_STOCK_API_MODE === "mock" ? "mock" : "live";
}
