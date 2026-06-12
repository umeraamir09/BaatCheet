import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { Loader2 } from "lucide-react";

function sanitizeUsername(raw: string | undefined, fallback: string): string {
  const cleaned = (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (cleaned.length >= 2) return cleaned;
  return fallback;
}

export function ProfileSetup() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.getMe);
  const { signOut } = useAuthActions();
  const completeSignUp = useMutation(api.users.completeSignUp);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || !me) return;
    const fallback = me.discordId ? `user_${me.discordId}` : "user";
    const derived = sanitizeUsername(me.displayName ?? me.username, fallback);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot prefill from server data
    setUsername(me.username && me.username.length >= 2 ? me.username : derived);
    setDisplayName(me.displayName ?? me.username ?? "");
    setPrefilled(true);
  }, [me, prefilled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await completeSignUp({
        username: username.trim(),
        displayName: displayName.trim(),
        authProvider: "discord",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !me) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="flex flex-col items-center gap-6 w-96">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Complete your profile</h1>
          <p className="text-[var(--color-text-secondary)] text-sm text-center">
            Choose a username for adding friends and a display name shown in chats.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--color-text-primary)]">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="e.g. john_doe"
              className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              Lowercase, numbers, and underscores only. Used for adding friends.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--color-text-primary)]">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              This is shown in chats and lists. You can change it later in settings.
            </span>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username.trim() || !displayName.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Continue"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => signOut()}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
