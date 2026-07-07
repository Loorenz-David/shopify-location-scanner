// Minimal interface — typed only for what camera-session.manager actually uses.
// This avoids fighting ZXing's complex / loosely-typed declaration files.
export interface QrReader {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
}

// Each call to the factory returns a fresh reader instance so decode state
// does not leak between concurrent sessions.
type QrReaderFactory = () => QrReader;

let factoryPromise: Promise<QrReaderFactory> | null = null;

export async function loadQrReaderFactory(): Promise<QrReaderFactory> {
  if (!factoryPromise) {
    factoryPromise = Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]).then(([browser, library]) => {
      const { BrowserMultiFormatReader } = browser;
      const { BarcodeFormat, DecodeHintType } = library;

      const hints = new Map<unknown, unknown>([
        [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
        [DecodeHintType.TRY_HARDER, true],
      ]);

      // Re-type the constructor to accept hints — the bundler module resolution
      // mode doesn't expose the optional-hints overload from ZXing's .d.ts.
      const Reader = BrowserMultiFormatReader as unknown as {
        new (hints: unknown): QrReader;
      };

      return () => new Reader(hints);
    });
  }

  return factoryPromise;
}
