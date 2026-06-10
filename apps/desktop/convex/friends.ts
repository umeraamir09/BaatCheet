import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./helpers";

export const sendRequest = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const senderId = await getUserId(ctx);

    if (!args.username.trim()) {
      throw new Error("Username is required");
    }

    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("name"), args.username.trim()))
      .first();

    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser._id === senderId) {
      throw new Error("Cannot send friend request to yourself");
    }

    const existing = await ctx.db
      .query("friends")
      .withIndex("by_sender_and_receiver", (q) =>
        q.eq("senderId", senderId).eq("receiverId", targetUser._id)
      )
      .first();

    const reverse = await ctx.db
      .query("friends")
      .withIndex("by_sender_and_receiver", (q) =>
        q.eq("senderId", targetUser._id).eq("receiverId", senderId)
      )
      .first();

    if (existing || reverse) {
      throw new Error("Friend request already exists or users are already friends");
    }

    await ctx.db.insert("friends", {
      senderId,
      receiverId: targetUser._id,
      status: "pending",
    });

    return targetUser._id;
  },
});

export const respondRequest = mutation({
  args: {
    friendId: v.id("friends"),
    action: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const entry = await ctx.db.get(args.friendId);
    if (!entry) throw new Error("Friend request not found");

    if (entry.receiverId !== userId) {
      throw new Error("Only the recipient can respond to this request");
    }

    if (entry.status !== "pending") {
      throw new Error("This request has already been responded to");
    }

    if (args.action === "accept") {
      await ctx.db.patch(args.friendId, { status: "accepted" });
    } else {
      await ctx.db.delete(args.friendId);
    }
  },
});

export const cancelRequest = mutation({
  args: {
    friendId: v.id("friends"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const entry = await ctx.db.get(args.friendId);
    if (!entry) throw new Error("Friend request not found");

    if (entry.senderId !== userId) {
      throw new Error("Only the sender can cancel this request");
    }

    await ctx.db.delete(args.friendId);
  },
});

export const removeFriend = mutation({
  args: {
    friendId: v.id("friends"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const entry = await ctx.db.get(args.friendId);
    if (!entry) throw new Error("Friendship not found");

    if (entry.senderId !== userId && entry.receiverId !== userId) {
      throw new Error("Not authorized to remove this friendship");
    }

    await ctx.db.delete(args.friendId);
  },
});

export const list = query({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    const sent = await ctx.db
      .query("friends")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .collect();

    const received = await ctx.db
      .query("friends")
      .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
      .collect();

    const all = [...sent, ...received];

    return Promise.all(
      all.map(async (f) => {
        const otherUserId = f.senderId === userId ? f.receiverId : f.senderId;
        const user = await ctx.db.get(otherUserId);
        return {
          ...f,
          friend: user,
          isIncoming: f.receiverId === userId,
        };
      })
    );
  },
});

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!args.query.trim()) return [];
    return await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), userId),
          q.eq(q.field("name"), args.query.trim())
        )
      )
      .take(10);
  },
});
