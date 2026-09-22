export type ManagerFullSyncSchedule = {
  timeZone: string;
  times: readonly string[];
};

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Parses the operator-facing comma-separated wall-clock schedule once at worker
 * startup. Fixed local times rather than a duration keep the schedule stable
 * across worker restarts and daylight-saving changes.
 */
export const parseManagerFullSyncTimes = (raw: string): readonly string[] => {
  const times = raw
    .split(",")
    .map((time) => time.trim())
    .filter((time) => time.length > 0);

  if (times.length === 0 || times.some((time) => !TIME_PATTERN.test(time))) {
    throw new Error(
      "MANAGER_FULL_SYNC_TIMES must be a comma-separated list of HH:mm times",
    );
  }

  const uniqueSorted = [...new Set(times)].sort();
  if (uniqueSorted.length !== times.length) {
    throw new Error("MANAGER_FULL_SYNC_TIMES must not contain duplicate times");
  }

  return uniqueSorted;
};

const stockholmParts = (now: Date, timeZone: string): Record<string, string> => {
  try {
    return Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
  } catch {
    throw new Error(`MANAGER_FULL_SYNC_TIME_ZONE is invalid: ${timeZone}`);
  }
};

/**
 * Returns a unique local-date slot only during a configured minute. Returning a
 * key rather than a boolean lets the worker avoid duplicate dispatches while its
 * 30-second scheduler polls that minute.
 */
export const managerFullSyncSlotKey = (
  now: Date,
  schedule: ManagerFullSyncSchedule,
): string | null => {
  const parts = stockholmParts(now, schedule.timeZone);
  const time = `${parts.hour ?? ""}:${parts.minute ?? ""}`;
  if (!schedule.times.includes(time)) {
    return null;
  }

  return `${parts.year}-${parts.month}-${parts.day}T${time}[${schedule.timeZone}]`;
};
