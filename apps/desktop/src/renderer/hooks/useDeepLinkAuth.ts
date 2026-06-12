import { useEffect, useRef } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export function useDeepLinkAuth() {
  const { signIn } = useAuthActions();
  const handling = useRef(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const handle = async (raw: unknown) => {
      if (handling.current) return;
      const payload = (raw ?? {}) as Record<string, unknown>;
      const code = typeof payload.code === "string" ? payload.code : null;
      if (!code) {
        console.error("[auth] deep link missing code param", payload);
        return;
      }
      handling.current = true;
      try {
        await (signIn as (provider?: string, options?: { code?: string }) => Promise<unknown>)(undefined, { code });
        console.log("[auth] deep link sign-in complete");
      } catch (err) {
        console.error("[auth] deep link sign-in failed:", err);
      } finally {
        handling.current = false;
      }
    };

    api.on("auth:callback", handle);
    return () => {
      api.off("auth:callback", handle);
    };
  }, [signIn]);
}
