export const startOfUtcDay = (value: Date): Date => {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
};

const MONTH_TO_INDEX = new Map<string, number>([
  ["jan", 0],
  ["january", 0],
  ["feb", 1],
  ["february", 1],
  ["mar", 2],
  ["march", 2],
  ["apr", 3],
  ["april", 3],
  ["may", 4],
  ["jun", 5],
  ["june", 5],
  ["jul", 6],
  ["july", 6],
  ["aug", 7],
  ["august", 7],
  ["sep", 8],
  ["sept", 8],
  ["september", 8],
  ["oct", 9],
  ["october", 9],
  ["nov", 10],
  ["november", 10],
  ["dec", 11],
  ["december", 11],
]);

export const parseNaturalDateTag = (value: string): Date | null => {
  const trimmed = value.trim();
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const dayToken = match[1];
  const monthToken = match[2];
  const yearToken = match[3];
  if (!dayToken || !monthToken || !yearToken) {
    return null;
  }

  const day = Number(dayToken);
  const month = MONTH_TO_INDEX.get(monthToken.toLowerCase());
  const year = Number(yearToken);

  if (!month && month !== 0) {
    return null;
  }

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return startOfUtcDay(candidate);
};
