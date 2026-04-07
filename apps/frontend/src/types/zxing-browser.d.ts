declare module "@zxing/browser" {
  export interface ZxingResultPoint {
    getX(): number;
    getY(): number;
  }

  export interface ZxingResult {
    getText(): string;
    getResultPoints(): ZxingResultPoint[];
  }

  export type DecodeContinuouslyCallback = (
    result: ZxingResult | undefined,
    error?: unknown,
  ) => void;

  export interface IScannerControls {
    stop(): void;
  }

  export class BrowserMultiFormatReader {
    decodeFromVideoDevice(
      deviceId: string | undefined,
      videoSource: HTMLVideoElement,
      callbackFn: DecodeContinuouslyCallback,
    ): Promise<IScannerControls>;
  }
}
