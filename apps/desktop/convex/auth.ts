import { convexAuth } from "@convex-dev/auth/server";
import Discord from "@auth/core/providers/discord";

const USERNAME_REGEX = /^[a-z0-9_]+$/;

function sanitizeUsername(raw: string | undefined, fallback: string): string {
  const cleaned = (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (cleaned.length >= 2 && USERNAME_REGEX.test(cleaned)) return cleaned;
  return fallback;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Discord({})],
  callbacks: {
    redirect: async () => {
      return "baatcheet://auth";
    },
    createOrUpdateUser: async (ctx, args) => {
      const { existingUserId, profile } = args;
      const profileRecord = profile as {
        id?: string;
        name?: string;
        global_name?: string;
        username?: string;
        email?: string;
        image?: string;
      };

      const discordId = profileRecord.id ?? "";
      const username = sanitizeUsername(
        profileRecord.global_name ?? profileRecord.username ?? profileRecord.name,
        discordId ? `user_${discordId}` : "user",
      );

      const existingUser = existingUserId ? await ctx.db.get(existingUserId) : null;

      const userData = {
        email: profileRecord.email,
        avatarUrl: profileRecord.image,
        discordId: discordId || undefined,
        authProvider: "discord" as const,
        username,
        displayName: profileRecord.global_name ?? profileRecord.name ?? username,
        profileComplete: existingUser?.profileComplete ?? false,
      };

      if (existingUserId) {
        await ctx.db.patch(existingUserId, userData);
        return existingUserId;
      }
      return await ctx.db.insert("users", userData);
    },
  },
});
