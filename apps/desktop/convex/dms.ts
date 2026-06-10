import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./helpers";

export const createOrGet = mutation({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    const allMembers1 = await ctx.db
      .query("dmMembers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    for (const m1 of allMembers1) {
      const isOtherUserInThread = await ctx.db
        .query("dmMembers")
        .withIndex("by_dm_thread_id", (q) => q.eq("dmThreadId", m1.dmThreadId))
        .filter((q) => q.eq(q.field("userId"), args.otherUserId))
        .first();

      if (isOtherUserInThread) {
        return m1.dmThreadId;
      }
    }

    const dmThreadId = await ctx.db.insert("directMessageThreads", {
      memberIds: [userId, args.otherUserId],
    });

    await ctx.db.insert("dmMembers", {
      dmThreadId,
      userId,
    });

    await ctx.db.insert("dmMembers", {
      dmThreadId,
      userId: args.otherUserId,
    });

    return dmThreadId;
  },
});

export const list = query({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    const memberships = await ctx.db
      .query("dmMembers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    const threads = await Promise.all(
      memberships.map((m) => ctx.db.get(m.dmThreadId))
    );

    return Promise.all(
      threads.filter((t) => t !== null).map(async (t) => {
        const otherUserIds = t.memberIds.filter(id => id !== userId);
        const users = await Promise.all(otherUserIds.map(id => ctx.db.get(id)));
        return {
          ...t,
          otherUsers: users.filter(u => u !== null),
        };
      })
    );
  },
});
