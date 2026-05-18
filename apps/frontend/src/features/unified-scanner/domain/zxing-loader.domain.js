let factoryPromise = null;
export async function loadQrReaderFactory() {
    if (!factoryPromise) {
        factoryPromise = Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
        ]).then(([browser, library]) => {
            const { BrowserMultiFormatReader } = browser;
            const { BarcodeFormat, DecodeHintType } = library;
            const hints = new Map([
                [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
                [DecodeHintType.TRY_HARDER, true],
            ]);
            // Re-type the constructor to accept hints — the bundler module resolution
            // mode doesn't expose the optional-hints overload from ZXing's .d.ts.
            const Reader = BrowserMultiFormatReader;
            return () => new Reader(hints);
        });
    }
    return factoryPromise;
}
