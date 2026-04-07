import { useEffect } from "react";

import { scannerActions } from "../actions/scanner.actions";
import { useScannerStore } from "../stores/scanner.store";

export function useScannerLinkFlow(): void {
  const selectedItem = useScannerStore((state) => state.selectedItem);
  const selectedLocation = useScannerStore((state) => state.selectedLocation);

  useEffect(() => {
    if (!selectedItem || !selectedLocation) {
      return;
    }

    void scannerActions.attemptLinkForCurrentSelection();
  }, [selectedItem, selectedLocation]);
}
