import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./helpers";

export const generate = mutation({
  args: {
    serverId: v.id("servers"),
    maxUses: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    const membership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only the server owner or admins can generate invite links");
    }

    const code = generateCode();

    await ctx.db.insert("inviteLinks", {
      serverId: args.serverId,
      code,
      createdBy: userId,
      expiresAt: args.expiresAt,
      uses: 0,
      maxUses: args.maxUses,
    });

    return code;
  },
});

export const list = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inviteLinks")
      .withIndex("by_server_id", (q) => q.eq("serverId", args.serverId))
      .collect();
  },
});

export const revoke = mutation({
  args: {
    inviteId: v.id("inviteLinks"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite link not found");

    const membership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", invite.serverId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only the server owner or admins can revoke invite links");
    }

    await ctx.db.delete(args.inviteId);
  },
});

export const join = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!args.code.trim()) {
      throw new Error("Invite code is required");
    }

    const invite = await ctx.db
      .query("inviteLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim()))
      .first();

    if (!invite) throw new Error("Invalid invite code");

    if (invite.expiresAt && Date.now() > invite.expiresAt) {
      await ctx.db.delete(invite._id);
      throw new Error("Invite link has expired");
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new Error("Invite link has reached maximum uses");
    }

    const existing = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", invite.serverId).eq("userId", userId)
      )
      .first();

    if (existing) throw new Error("You are already a member of this server");

    await ctx.db.insert("serverMembers", {
      serverId: invite.serverId,
      userId,
      role: "member",
    });

    await ctx.db.patch(invite._id, { uses: invite.uses + 1 });

    return invite.serverId;
  },
});

export const validate = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("inviteLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!invite) return null;

    if (invite.expiresAt && Date.now() > invite.expiresAt) {
      return null;
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      return null;
    }

    const server = await ctx.db.get(invite.serverId);
    return { server: server ? { _id: server._id, name: server.name, imageUrl: server.imageUrl } : null };
  },
});

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
