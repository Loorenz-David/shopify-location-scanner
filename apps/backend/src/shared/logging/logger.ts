type LogLevel = "info" | "warn" | "error";

const writeLog = (level: LogLevel, message: string, context?: unknown) => {
  const payload = {
    level,
    message,
    ...(context ? { context } : {}),
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
};

export const logger = {
  info: (message: string, context?: unknown) =>
    writeLog("info", message, context),
  warn: (message: string, context?: unknown) =>
    writeLog("warn", message, context),
  error: (message: string, context?: unknown) =>
    writeLog("error", message, context),
};
