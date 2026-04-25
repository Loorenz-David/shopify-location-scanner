import { UnifiedScannerProvider } from "./providers/UnifiedScannerProvider";
import { UnifiedScannerPage } from "./ui/UnifiedScannerPage";

export function UnifiedScannerFeature() {
  return (
    <UnifiedScannerProvider>
      <UnifiedScannerPage />
    </UnifiedScannerProvider>
  );
}
