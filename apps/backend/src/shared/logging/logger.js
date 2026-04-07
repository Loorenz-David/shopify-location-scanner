const writeLog = (level, message, context) => {
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
    info: (message, context) => writeLog("info", message, context),
    warn: (message, context) => writeLog("warn", message, context),
    error: (message, context) => writeLog("error", message, context),
};
//# sourceMappingURL=logger.js.map