import { useEffect } from "react";
import { pwaActions } from "../actions/pwa.actions";

export function usePwaFlow(): void {
  useEffect(() => {
    void pwaActions.register();
  }, []);
}
