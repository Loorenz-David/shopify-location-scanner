import { createContext, useContext } from "react";

export const SlidingOverlayReadyContext = createContext(false);

export function useSlidingOverlayReady() {
  return useContext(SlidingOverlayReadyContext);
}
