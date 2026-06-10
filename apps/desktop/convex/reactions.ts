import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./helpers";

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!args.emoji.trim()) {
      throw new Error("Emoji is required");
    }

    const existingReaction = await ctx.db
      .query("reactions")
      .withIndex("by_message_and_user_and_emoji", (q) =>
        q
          .eq("messageId", args.messageId)
          .eq("userId", userId)
          .eq("emoji", args.emoji)
      )
      .first();

    if (existingReaction) {
      await ctx.db.delete(existingReaction._id);
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
      });
    }
  },
});
