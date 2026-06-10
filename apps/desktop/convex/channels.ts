import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./helpers";

const MAX_NAME_LENGTH = 100;

export const create = mutation({
  args: {
    name: v.string(),
    serverId: v.id("servers"),
    type: v.optional(v.union(v.literal("text"), v.literal("voice"))),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (args.name.trim().length === 0 || args.name.length > MAX_NAME_LENGTH) {
      throw new Error(`Channel name must be between 1 and ${MAX_NAME_LENGTH} characters`);
    }

    const server = await ctx.db.get(args.serverId);
    if (!server) throw new Error("Server not found");

    const membership = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_and_user", (q) =>
        q.eq("serverId", args.serverId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Only the server owner or admins can create channels");
    }
    return await ctx.db.insert("channels", {
      name: args.name,
      serverId: args.serverId,
      type: args.type ?? "text",
    });
  },
});

export const list = query({
  args: { serverId: v.id("servers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("channels")
      .withIndex("by_server_id", (q) => q.eq("serverId", args.serverId))
      .collect();
  },
});
