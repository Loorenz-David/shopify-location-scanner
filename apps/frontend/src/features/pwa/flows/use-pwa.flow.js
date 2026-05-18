import { useEffect } from "react";
import { pwaActions } from "../actions/pwa.actions";
export function usePwaFlow() {
    useEffect(() => {
        void pwaActions.register();
    }, []);
}
