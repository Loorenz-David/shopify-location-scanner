import { useEffect } from "react";
import { onWsEvent } from "./ws-client";
export function useWsEvent(type, handler) {
    useEffect(() => {
        const unsubscribe = onWsEvent(type, handler);
        return unsubscribe;
    }, [handler, type]);
}
