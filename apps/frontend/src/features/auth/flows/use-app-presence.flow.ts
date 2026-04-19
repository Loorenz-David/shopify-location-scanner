import { useEffect } from "react";
import { authActions } from "../actions/auth.actions";
import type { AuthUserDto } from "../types/auth.dto";

export function useAppPresenceFlow(authenticatedUser: AuthUserDto | null): void {
  useEffect(() => {
    if (!authenticatedUser) {
      return;
    }

    // Signal app entry on mount / foreground
    void authActions.appEnter().catch(() => undefined);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void authActions.appLeave().catch(() => undefined);
      } else {
        void authActions.appEnter().catch(() => undefined);
      }
    };

    const handleBeforeUnload = () => {
      void authActions.appLeave().catch(() => undefined);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void authActions.appLeave().catch(() => undefined);
    };
  }, [authenticatedUser]);
}
