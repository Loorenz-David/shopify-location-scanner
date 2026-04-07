import { ScannerFeatureProvider } from "./providers/ScannerFeatureProvider";
import { ScannerPage } from "./ui/ScannerPage";

export function ScannerFeature() {
  return (
    <ScannerFeatureProvider>
      <ScannerPage />
    </ScannerFeatureProvider>
  );
}
