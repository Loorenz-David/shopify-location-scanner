import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { authActions } from "./features/auth/actions/auth.actions";
import { bootstrapActions } from "./features/bootstrap/actions/bootstrap.actions";
import { AuthPage } from "./features/auth/ui/AuthPage";
import { HomeFeature } from "./features/home/HomeFeature";
import { RoleContextProvider } from "./features/role-context/providers/RoleContextProvider";
import { usePwaFlow } from "./features/pwa/flows/use-pwa.flow";
import { usePwaStore } from "./features/pwa/stores/pwa.store";
import { PwaUpdatePrompt } from "./features/pwa/ui/PwaUpdatePrompt";
import { tokenAuthController } from "./core/api-client";
import { useWsEvent } from "./core/ws-client/use-ws-event";
import { useAppPresenceFlow } from "./features/auth/flows/use-app-presence.flow";
import { useCameraAppLifecycleFlow } from "./features/unified-scanner/flows/use-camera-app-lifecycle.flow";
const SESSION_INVALIDATED_RELOAD_KEY = "sessionInvalidatedReloadPending";
const SESSION_INVALIDATED_MESSAGE = "Your session expired. Please sign in again.";
function App() {
    usePwaFlow();
    useCameraAppLifecycleFlow();
    const [isSessionCheckPending, setIsSessionCheckPending] = useState(true);
    const [authenticatedUser, setAuthenticatedUser] = useState(null);
    const [isAuthSubmitPending, setIsAuthSubmitPending] = useState(false);
    const [authErrorMessage, setAuthErrorMessage] = useState(null);
    const isPwaUpdateVisible = usePwaStore((state) => state.updateAvailable);
    const isApplyingPwaUpdate = usePwaStore((state) => state.isApplyingUpdate);
    useAppPresenceFlow(authenticatedUser);
    useEffect(() => {
        const shouldShowSessionInvalidatedMessage = sessionStorage.getItem(SESSION_INVALIDATED_RELOAD_KEY) === "1";
        if (shouldShowSessionInvalidatedMessage) {
            sessionStorage.removeItem(SESSION_INVALIDATED_RELOAD_KEY);
            setAuthErrorMessage(SESSION_INVALIDATED_MESSAGE);
        }
    }, []);
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
    const handleLogin = async (payload) => {
        setIsAuthSubmitPending(true);
        setAuthErrorMessage(null);
        try {
            const user = await authActions.login(payload);
            setAuthenticatedUser(user);
        }
        catch {
            setAuthErrorMessage("Login failed. Check your credentials and retry.");
            authActions.clearSession();
        }
        finally {
            setIsAuthSubmitPending(false);
        }
    };
    const handleRegister = async (payload) => {
        setIsAuthSubmitPending(true);
        setAuthErrorMessage(null);
        try {
            // Backend register returns the same authenticated session payload as login.
            const user = await authActions.register(payload);
            setAuthenticatedUser(user);
        }
        catch {
            setAuthErrorMessage("Registration failed. Review the form and try again.");
            authActions.clearSession();
        }
        finally {
            setIsAuthSubmitPending(false);
        }
    };
    const handleLogout = () => {
        setAuthenticatedUser(null);
        setAuthErrorMessage(null);
    };
    const handleSessionInvalidated = useCallback(() => {
        sessionStorage.setItem(SESSION_INVALIDATED_RELOAD_KEY, "1");
        setAuthenticatedUser(null);
        setAuthErrorMessage(SESSION_INVALIDATED_MESSAGE);
        authActions.clearSession();
        window.location.reload();
    }, []);
    useWsEvent("session_invalidated", handleSessionInvalidated);
    useEffect(() => {
        return tokenAuthController.onSessionExpired(() => {
            setAuthenticatedUser(null);
            setAuthErrorMessage(SESSION_INVALIDATED_MESSAGE);
            authActions.clearSession();
        });
    }, []);
    if (isSessionCheckPending) {
        return (_jsxs(_Fragment, { children: [_jsx("main", { className: "grid min-h-svh place-items-center bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)]", children: _jsx("p", { className: "m-0 text-sm font-semibold text-slate-700", children: "Loading session..." }) }), _jsx(PwaUpdatePrompt, { isVisible: isPwaUpdateVisible, isApplyingUpdate: isApplyingPwaUpdate })] }));
    }
    if (!authenticatedUser) {
        return (_jsxs(_Fragment, { children: [_jsx(AuthPage, { isLoading: isAuthSubmitPending, errorMessage: authErrorMessage, onLogin: handleLogin, onRegister: handleRegister }), _jsx(PwaUpdatePrompt, { isVisible: isPwaUpdateVisible, isApplyingUpdate: isApplyingPwaUpdate })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(RoleContextProvider, { user: authenticatedUser, children: _jsx(HomeFeature, { onLogout: handleLogout }) }), _jsx(PwaUpdatePrompt, { isVisible: isPwaUpdateVisible, isApplyingUpdate: isApplyingPwaUpdate })] }));
}
export default App;
