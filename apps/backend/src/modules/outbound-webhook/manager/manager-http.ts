import { ManagerDeleteResponseSchema, ManagerDemandResponseSchema, ManagerProcessedResponseSchema } from "../contracts/outbound-webhook.contract.js";

export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return true;
  const message = error instanceof Error ? error.message : String(error ?? "unknown");
  return ["fetch failed", "ECONNREFUSED", "ECONNRESET", "socket hang up"].some((part) => message.includes(part));
};

export const postJson = async (url: string, secret: string, body: string): Promise<{ status: number; body: string }> => {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": secret }, body, signal: AbortSignal.timeout(8_000) });
  return { status: response.status, body: await response.text() };
};

export type ManagerKind = "demand" | "delete" | "processed";
export const parseManagerResponse = (kind: ManagerKind, body: string, count: number): unknown[] | null => {
  try {
    const schema = kind === "demand" ? ManagerDemandResponseSchema : kind === "delete" ? ManagerDeleteResponseSchema : ManagerProcessedResponseSchema;
    const parsed = schema.parse(JSON.parse(body));
    return parsed.data.results.length === count ? parsed.data.results : null;
  } catch { return null; }
};
