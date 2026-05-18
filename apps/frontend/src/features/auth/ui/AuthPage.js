import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
export function AuthPage({ isLoading, errorMessage, onLogin, onRegister, }) {
    const [mode, setMode] = useState("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [registrationKey, setRegistrationKey] = useState("");
    const [validationMessage, setValidationMessage] = useState(null);
    const isRegisterMode = mode === "register";
    const handleSubmit = async (event) => {
        event.preventDefault();
        setValidationMessage(null);
        if (isRegisterMode && password !== confirmPassword) {
            setValidationMessage("Passwords do not match.");
            return;
        }
        if (isRegisterMode) {
            await onRegister({
                username,
                password,
                key: registrationKey.trim() || undefined,
            });
            return;
        }
        await onLogin({ username, password });
    };
    return (_jsx("main", { className: "relative min-h-svh bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)] px-4 py-8", children: _jsxs("section", { className: "auth-modern-font mx-auto mt-[max(6svh,48px)] w-full max-w-md rounded-2xl border border-slate-900/10 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur", children: [_jsxs("header", { className: "mb-6", children: [_jsx("h1", { className: "m-0 text-2xl font-extrabold tracking-tight text-slate-900", children: isRegisterMode ? "Create account" : "Welcome back" }), _jsx("p", { className: "mb-0 mt-2 text-sm text-slate-600", children: isRegisterMode
                                ? "Register to start scanning and linking items."
                                : "Log in to continue to the scanner workspace." })] }), _jsxs("form", { className: "flex flex-col gap-4", onSubmit: handleSubmit, children: [_jsxs("label", { className: "flex flex-col gap-1 text-sm font-semibold text-slate-800", children: ["Username", _jsx("input", { className: "h-11 rounded-xl border border-slate-800/20 bg-white px-3 text-sm", value: username, onChange: (event) => setUsername(event.target.value), autoComplete: "username", required: true })] }), _jsxs("label", { className: "flex flex-col gap-1 text-sm font-semibold text-slate-800", children: ["Password", _jsx("input", { type: "password", className: "h-11 rounded-xl border border-slate-800/20 bg-white px-3 text-sm", value: password, onChange: (event) => setPassword(event.target.value), autoComplete: isRegisterMode ? "new-password" : "current-password", required: true, minLength: 8 })] }), isRegisterMode ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "flex flex-col gap-1 text-sm font-semibold text-slate-800", children: ["Confirm password", _jsx("input", { type: "password", className: "h-11 rounded-xl border border-slate-800/20 bg-white px-3 text-sm", value: confirmPassword, onChange: (event) => setConfirmPassword(event.target.value), autoComplete: "new-password", required: true, minLength: 8 })] }), _jsxs("label", { className: "flex flex-col gap-1 text-sm font-semibold text-slate-800", children: ["Key (optional)", _jsx("input", { className: "h-11 rounded-xl border border-slate-800/20 bg-white px-3 text-sm", value: registrationKey, onChange: (event) => setRegistrationKey(event.target.value), autoComplete: "off" })] })] })) : null, validationMessage ? (_jsx("p", { className: "m-0 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900", children: validationMessage })) : null, errorMessage ? (_jsx("p", { className: "m-0 rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-900", children: errorMessage })) : null, _jsx("button", { type: "submit", className: "mt-2 h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-slate-50 disabled:cursor-not-allowed disabled:opacity-70", disabled: isLoading, children: isLoading
                                ? "Please wait..."
                                : isRegisterMode
                                    ? "Register"
                                    : "Login" })] }), _jsx("button", { type: "button", className: "mt-4 text-sm font-semibold text-sky-800", onClick: () => {
                        setMode((currentMode) => currentMode === "login" ? "register" : "login");
                        setValidationMessage(null);
                    }, children: isRegisterMode
                        ? "Already have an account? Switch to login"
                        : "Need an account? Switch to register" })] }) }));
}
