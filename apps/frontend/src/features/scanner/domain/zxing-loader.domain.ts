import type { BrowserMultiFormatReader } from "@zxing/browser";

let browserMultiFormatReaderPromise: Promise<
  typeof BrowserMultiFormatReader
> | null = null;

export async function loadBrowserMultiFormatReader(): Promise<
  typeof BrowserMultiFormatReader
> {
  if (!browserMultiFormatReaderPromise) {
    browserMultiFormatReaderPromise = import("@zxing/browser").then(
      (module) => module.BrowserMultiFormatReader,
    );
  }

  return browserMultiFormatReaderPromise;
}
