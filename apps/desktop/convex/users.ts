import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const USERNAME_REGEX = /^[a-z0-9_]+$/;

export const completeSignUp = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    discordId: v.optional(v.string()),
    authProvider: v.union(v.literal("discord"), v.literal("password")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const existingUser = await ctx.db.get(userId);

    const username = args.username.toLowerCase().trim();

    if (!USERNAME_REGEX.test(username)) {
      throw new Error("Username must be lowercase and contain only letters, numbers, and underscores");
    }

    if (username.length < 2 || username.length > 32) {
      throw new Error("Username must be between 2 and 32 characters");
    }

    if (!args.displayName.trim()) {
      throw new Error("Display name is required");
    }

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        username,
        displayName: args.displayName.trim(),
        avatarUrl: args.avatarUrl ?? existingUser.avatarUrl,
        profileComplete: true,
      });
      return existingUser._id;
    }

    const existingByUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (existingByUsername) {
      throw new Error("Username is already taken");
    }

    const identity = await ctx.auth.getUserIdentity();
    return await ctx.db.insert("users", {
      username,
      displayName: args.displayName.trim(),
      email: identity?.email ?? undefined,
      avatarUrl: args.avatarUrl,
      discordId: args.discordId,
      authProvider: args.authProvider,
      profileComplete: true,
    });
  },
});

export const getMe = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const patch: Record<string, string> = {};

    if (args.displayName !== undefined) {
      if (!args.displayName.trim()) throw new Error("Display name cannot be empty");
      patch.displayName = args.displayName.trim();
    }

    if (args.username !== undefined) {
      const username = args.username.toLowerCase().trim();
      if (!USERNAME_REGEX.test(username)) {
        throw new Error("Username must be lowercase and contain only letters, numbers, and underscores");
      }
      if (username.length < 2 || username.length > 32) {
        throw new Error("Username must be between 2 and 32 characters");
      }
      const existing = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", username))
        .unique();
      if (existing && existing._id !== user._id) {
        throw new Error("Username is already taken");
      }
      patch.username = username;
    }

    if (args.avatarUrl !== undefined) {
      patch.avatarUrl = args.avatarUrl;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch);
    }

    return user._id;
  },
});
