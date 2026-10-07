import { useState } from "react";

interface AuthPageProps {
  isLoading: boolean;
  errorMessage: string | null;
  onLogin: (payload: { username: string; password: string }) => Promise<void>;
}

export function AuthPage({ isLoading, errorMessage, onLogin }: AuthPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLogin({ username, password });
  };

  return (
    <main className="relative min-h-svh bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)] px-4 py-8">
      <section className="auth-modern-font mx-auto mt-[max(6svh,48px)] w-full max-w-md rounded-2xl border border-slate-900/10 bg-white/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur">
        <header className="mb-6">
          <h1 className="m-0 text-2xl font-extrabold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mb-0 mt-2 text-sm text-slate-600">
            Log in to continue to the scanner workspace.
          </p>
        </header>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
            Username
            <input
              className="h-11 rounded-xl border border-slate-800/20 bg-white px-3 text-sm"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
            Password
            <input
              type="password"
              className="h-11 rounded-xl border border-slate-800/20 bg-white px-3 text-sm"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              minLength={8}
            />
          </label>

          {errorMessage ? (
            <p className="m-0 rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-900">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-2 h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? "Please wait..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
