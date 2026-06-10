import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./helpers";

const MAX_NAME_LENGTH = 100;

export const create = mutation({
  args: {
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (args.name.trim().length === 0 || args.name.length > MAX_NAME_LENGTH) {
      throw new Error(`Server name must be between 1 and ${MAX_NAME_LENGTH} characters`);
    }

    const serverId = await ctx.db.insert("servers", {
      name: args.name,
      ownerId: userId,
      imageUrl: args.imageUrl,
    });

    await ctx.db.insert("serverMembers", {
      serverId,
      userId,
      role: "owner",
    });

    await ctx.db.insert("channels", {
      name: "general",
      serverId,
      type: "text",
    });

    return serverId;
  },
});

export const list = query({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const members = await ctx.db
      .query("serverMembers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    const servers = await Promise.all(
      members.map((m) => ctx.db.get(m.serverId))
    );

    return servers.filter((s) => s !== null);
  },
});

export const members = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    await getUserId(ctx);
    const memberships = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_id", (q) => q.eq("serverId", args.serverId))
      .collect();

    const users = await Promise.all(
      memberships.map((m) => {
        const user = ctx.db.get(m.userId);
        return user.then((u) => (u ? { ...u, role: m.role, membershipId: m._id } : null));
      })
    );

    return users.filter((u) => u !== null);
  },
});

export const getMember = query({
  args: { serverId: v.id("servers"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await getUserId(ctx);
    const membership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", args.userId)
      )
      .first();
    return membership ?? null;
  },
});

export const listMembers = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    const callerMembership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", userId)
      )
      .first();

    if (!callerMembership) {
      throw new Error("Not a member of this server");
    }

    const memberships = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_id", (q) => q.eq("serverId", args.serverId))
      .collect();

    return Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { ...m, user };
      })
    );
  },
});

export const updateRole = mutation({
  args: {
    serverId: v.id("servers"),
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);

    const callerMembership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", callerId)
      )
      .first();

    if (!callerMembership || callerMembership.role !== "owner") {
      throw new Error("Only the server owner can update roles");
    }

    const targetMembership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", args.targetUserId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("Target user is not a member of this server");
    }

    if (targetMembership.role === "owner") {
      throw new Error("Cannot change the owner's role");
    }

    await ctx.db.patch(targetMembership._id, { role: args.newRole });
  },
});

export const kick = mutation({
  args: {
    serverId: v.id("servers"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);

    const callerMembership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", callerId)
      )
      .first();

    if (!callerMembership) {
      throw new Error("Caller is not a member of this server");
    }

    if (callerMembership.role !== "owner" && callerMembership.role !== "admin") {
      throw new Error("Only the server owner or admins can kick members");
    }

    const targetMembership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", args.targetUserId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("Target user is not a member of this server");
    }

    if (targetMembership.role === "owner") {
      throw new Error("Cannot kick the server owner");
    }

    if (callerMembership.role === "admin" && targetMembership.role === "admin") {
      throw new Error("Admins cannot kick other admins");
    }

    await ctx.db.delete(targetMembership._id);
  },
});

export const transferOwnership = mutation({
  args: {
    serverId: v.id("servers"),
    newOwnerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);

    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error("Server not found");
    if (server.ownerId !== callerId) {
      throw new Error("Only the current owner can transfer ownership");
    }

    const callerMembership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", callerId)
      )
      .first();

    const newOwnerMembership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", args.newOwnerId)
      )
      .first();

    if (!newOwnerMembership) {
      throw new Error("New owner must be a member of the server");
    }

    await ctx.db.patch(args.serverId, { ownerId: args.newOwnerId });
    if (callerMembership) {
      await ctx.db.patch(callerMembership._id, { role: "admin" });
    }
    await ctx.db.patch(newOwnerMembership._id, { role: "owner" });
  },
});
