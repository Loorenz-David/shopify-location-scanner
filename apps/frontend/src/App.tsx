import { useCallback, useEffect, useState } from "react";

import { authActions } from "./features/auth/actions/auth.actions";
import { bootstrapActions } from "./features/bootstrap/actions/bootstrap.actions";
import type { AuthUserDto } from "./features/auth/types/auth.dto";
import { AuthPage } from "./features/auth/ui/AuthPage";
import { HomeFeature } from "./features/home/HomeFeature";
import { RoleContextProvider } from "./features/role-context/providers/RoleContextProvider";
import { usePwaFlow } from "./features/pwa/flows/use-pwa.flow";
import { usePwaStore } from "./features/pwa/stores/pwa.store";
import { PwaUpdatePrompt } from "./features/pwa/ui/PwaUpdatePrompt";
import { useWsEvent } from "./core/ws-client/use-ws-event";

function App() {
  usePwaFlow();

  const [isSessionCheckPending, setIsSessionCheckPending] = useState(true);
  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthUserDto | null>(null);
  const [isAuthSubmitPending, setIsAuthSubmitPending] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const isPwaUpdateVisible = usePwaStore((state) => state.updateAvailable);
  const isApplyingPwaUpdate = usePwaStore((state) => state.isApplyingUpdate);

  useEffect(() => {
    let isDisposed = false;

    const hydrate = async () => {
      const user = await authActions.hydrateSession();
      if (isDisposed) {
        return;
      }

      setAuthenticatedUser(user);
      setIsSessionCheckPending(false);
    };

    void hydrate();

    return () => {
      isDisposed = true;
    };
  }, []);

  useEffect(() => {
    if (!authenticatedUser?.shopId) {
      bootstrapActions.clear();
      return;
    }

    void bootstrapActions.hydrate();
  }, [authenticatedUser?.shopId]);

  const handleLogin = async (payload: {
    username: string;
    password: string;
  }) => {
    setIsAuthSubmitPending(true);
    setAuthErrorMessage(null);

    try {
      const user = await authActions.login(payload);
      setAuthenticatedUser(user);
    } catch {
      setAuthErrorMessage("Login failed. Check your credentials and retry.");
      authActions.clearSession();
    } finally {
      setIsAuthSubmitPending(false);
    }
  };

  const handleRegister = async (payload: {
    username: string;
    password: string;
    key?: string;
  }) => {
    setIsAuthSubmitPending(true);
    setAuthErrorMessage(null);

    try {
      // Backend register returns the same authenticated session payload as login.
      const user = await authActions.register(payload);
      setAuthenticatedUser(user);
    } catch {
      setAuthErrorMessage(
        "Registration failed. Review the form and try again.",
      );
      authActions.clearSession();
    } finally {
      setIsAuthSubmitPending(false);
    }
  };

  const handleLogout = () => {
    setAuthenticatedUser(null);
    setAuthErrorMessage(null);
  };

  const handleSessionInvalidated = useCallback(() => {
    authActions.clearSession();
    window.location.reload();
  }, []);

  useWsEvent("session_invalidated", handleSessionInvalidated);

  if (isSessionCheckPending) {
    return (
      <>
        <main className="grid min-h-svh place-items-center bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)]">
          <p className="m-0 text-sm font-semibold text-slate-700">
            Loading session...
          </p>
        </main>
        <PwaUpdatePrompt
          isVisible={isPwaUpdateVisible}
          isApplyingUpdate={isApplyingPwaUpdate}
        />
      </>
    );
  }

  if (!authenticatedUser) {
    return (
      <>
        <AuthPage
          isLoading={isAuthSubmitPending}
          errorMessage={authErrorMessage}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
        <PwaUpdatePrompt
          isVisible={isPwaUpdateVisible}
          isApplyingUpdate={isApplyingPwaUpdate}
        />
      </>
    );
  }

  return (
    <>
      <RoleContextProvider user={authenticatedUser}>
        <HomeFeature onLogout={handleLogout} />
      </RoleContextProvider>
      <PwaUpdatePrompt
        isVisible={isPwaUpdateVisible}
        isApplyingUpdate={isApplyingPwaUpdate}
      />
    </>
  );
}

export default App;
