import { useEffect } from "react";

import { onWsEvent } from "./ws-client";
import type { WsInboundEvent } from "./ws-events";

export function useWsEvent<T extends WsInboundEvent>(
  type: T["type"],
  handler: (event: T) => void,
): void {
  useEffect(() => {
    const unsubscribe = onWsEvent(type, handler);
    return unsubscribe;
  }, [handler, type]);
}
