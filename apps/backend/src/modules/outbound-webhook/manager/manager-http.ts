import { logger } from "../../../shared/logging/logger.js";
import {
  ManagerDeleteResponseSchema,
  ManagerDemandResponseSchema,
  ManagerProcessedResponseSchema,
} from "../contracts/outbound-webhook.contract.js";

/**
 * Handoff v2 §3.5: Manager never commits a demand or delete call later than 5 s
 * after it arrived, so this client timeout must stay above that. Changing it is
 * a cross-application decision.
 */
export const MANAGER_TIMEOUT_MS = 8_000;

/** §12A.9: `responseBody` keeps the first 16 384 characters of Manager's answer. */
export const RESPONSE_BODY_CAP = 16_384;

/**
 * Handoff v2 §6.6 verbatim: the abort from `AbortSignal.timeout` carries the
 * word "TimeoutError" only in `error.name`, never in the message, so classifying
 * by message silently completes a timed-out delivery instead of retrying it.
 * Shared with `outbound-webhook-worker.ts` so `item_placed` gets the same fix.
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? "unknown");
  return (
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("socket hang up")
  );
};

export type PostJson = (
  url: string,
  secret: string,
  body: string,
) => Promise<{ status: number; body: string }>;

export const postJson: PostJson = async (url, secret, body) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": secret,
    },
    body,
    signal: AbortSignal.timeout(MANAGER_TIMEOUT_MS),
  });

  return { status: response.status, body: await response.text() };
};

export type ManagerKind = "demand" | "delete" | "processed";
export type ManagerResult = { outcome: string; reason?: string | null };

const schemaFor = (kind: ManagerKind) => {
  if (kind === "demand") {
    return ManagerDemandResponseSchema;
  }
  if (kind === "delete") {
    return ManagerDeleteResponseSchema;
  }
  return ManagerProcessedResponseSchema;
};

/**
 * §12A.8: the whole body is validated, and the result count must equal the entry
 * count. Anything else is "unparseable" — an anomaly that never touches the ledger.
 */
export const parseManagerResponse = (
  kind: ManagerKind,
  body: string,
  entryCount: number,
): ManagerResult[] | null => {
  try {
    const parsed = schemaFor(kind).parse(JSON.parse(body));
    if (parsed.data.results.length !== entryCount) {
      return null;
    }
    return parsed.data.results as ManagerResult[];
  } catch {
    return null;
  }
};

export type ManagerResponse =
  | { kind: "ok"; status: number; body: string; results: ManagerResult[] }
  | { kind: "unparseable"; status: number; body: string }
  | { kind: "rejected"; status: number; body: string }
  | { kind: "retryable"; status: number | null; body: string | null; error: string }
  | { kind: "fatal"; error: string };

export const truncateResponseBody = (body: string | null): string | null =>
  body === null ? null : body.slice(0, RESPONSE_BODY_CAP);

/** The `error` string of a Manager failure body, for logs only (handoff v2 §3.4). */
export const managerErrorText = (body: string | null): string | null => {
  if (!body) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
      const value = (parsed as { error: unknown }).error;
      return typeof value === "string" ? value : null;
    }
  } catch {
    return null;
  }
  return null;
};

/** §12A.8 classification table, applied to one HTTP request. */
export const sendManagerRequest = async (input: {
  kind: ManagerKind;
  url: string;
  secret: string;
  body: string;
  entryCount: number;
  post: PostJson;
}): Promise<ManagerResponse> => {
  let response: { status: number; body: string };

  try {
    response = await input.post(input.url, input.secret, input.body);
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    const described = `${name}: ${message}`;
    return isRetryableError(error)
      ? { kind: "retryable", status: null, body: null, error: described }
      : { kind: "fatal", error: described };
  }

  if (response.status >= 200 && response.status < 300) {
    const results = parseManagerResponse(input.kind, response.body, input.entryCount);
    return results === null
      ? { kind: "unparseable", status: response.status, body: response.body }
      : { kind: "ok", status: response.status, body: response.body, results };
  }

  if (response.status >= 500) {
    return {
      kind: "retryable",
      status: response.status,
      body: response.body,
      error: `Manager returned HTTP ${response.status}`,
    };
  }

  return { kind: "rejected", status: response.status, body: response.body };
};

/**
 * §12A.8 log levels for a non-retryable status. 401 and 422 are loud because
 * nothing changes until a human acts (handoff v2 §6.2).
 */
export const logRejectedResponse = (
  status: number,
  body: string,
  context: Record<string, unknown>,
): void => {
  if (status === 401) {
    logger.error("Manager rejected the API key", { ...context, status });
    return;
  }
  if (status === 422) {
    logger.error("Manager rejected the request as a sender bug", {
      ...context,
      status,
      managerError: managerErrorText(body),
    });
    return;
  }
  logger.warn("Manager rejected the request", { ...context, status });
};
