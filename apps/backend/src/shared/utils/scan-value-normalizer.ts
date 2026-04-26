export type ScanValueType = "url-handle" | "art-number" | "raw";

export type NormalizedScanValue = {
  value: string;
  type: ScanValueType;
};

type ScanFormatter = {
  type: ScanValueType;
  matches: (value: string) => boolean;
  extract: (value: string) => string;
};

const formatters: ScanFormatter[] = [
  {
    type: "url-handle",
    // https://beyovintage.se/products/st6-110326/  →  st6-110326
    matches: (v) => v.startsWith("http://") || v.startsWith("https://"),
    extract: (v) => {
      try {
        const segments = new URL(v).pathname.split("/").filter(Boolean);
        const last = segments[segments.length - 1];
        if (last) return last;
      } catch {
        // fall through
      }
      return v;
    },
  },
  {
    type: "art-number",
    // Art:101234  →  101234
    matches: (v) => /^Art:/i.test(v),
    extract: (v) => v.replace(/^Art:/i, "").trim(),
  },
];

export const normalizeScanValue = (raw: string): NormalizedScanValue => {
  const trimmed = raw.trim();
  for (const formatter of formatters) {
    if (formatter.matches(trimmed)) {
      return { value: formatter.extract(trimmed), type: formatter.type };
    }
  }
  return { value: trimmed, type: "raw" };
};
