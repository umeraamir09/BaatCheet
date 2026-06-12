import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./helpers";

const MAX_MESSAGE_LENGTH = 10000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export const listByChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    await getUserId(ctx);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(100);

    return Promise.all(
      messages.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        let repliedMessage = null;
        if (m.replyToMessageId) {
          const replied = await ctx.db.get(m.replyToMessageId);
          if (replied) {
            const repliedSender = await ctx.db.get(replied.senderId);
            repliedMessage = { ...replied, sender: repliedSender };
          }
        }
        let fileUrl: string | null = null;
        if (m.fileId) {
          fileUrl = await ctx.storage.getUrl(m.fileId);
        }

        const rawReactions = await ctx.db
          .query("reactions")
          .withIndex("by_message_id", (q) => q.eq("messageId", m._id))
          .collect();

        const reactions = await Promise.all(
          rawReactions.map(async (r) => {
            const user = await ctx.db.get(r.userId);
            return { ...r, user };
          })
        );

        return { ...m, sender, repliedMessage, fileUrl, reactions };
      })
    );
  },
});

export const listByDM = query({
  args: { dmThreadId: v.id("directMessageThreads") },
  handler: async (ctx, args) => {
    await getUserId(ctx);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_dm_thread_id", (q) => q.eq("dmThreadId", args.dmThreadId))
      .order("desc")
      .take(100);

    return Promise.all(
      messages.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        let repliedMessage = null;
        if (m.replyToMessageId) {
          const replied = await ctx.db.get(m.replyToMessageId);
          if (replied) {
            const repliedSender = await ctx.db.get(replied.senderId);
            repliedMessage = { ...replied, sender: repliedSender };
          }
        }
        let fileUrl: string | null = null;
        if (m.fileId) {
          fileUrl = await ctx.storage.getUrl(m.fileId);
        }

        const rawReactions = await ctx.db
          .query("reactions")
          .withIndex("by_message_id", (q) => q.eq("messageId", m._id))
          .collect();

        const reactions = await Promise.all(
          rawReactions.map(async (r) => {
            const user = await ctx.db.get(r.userId);
            return { ...r, user };
          })
        );

        return { ...m, sender, repliedMessage, fileUrl, reactions };
      })
    );
  },
});

export const send = mutation({
  args: {
    text: v.string(),
    channelId: v.optional(v.id("channels")),
    dmThreadId: v.optional(v.id("directMessageThreads")),
    replyToMessageId: v.optional(v.id("messages")),
    fileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const senderId = await getUserId(ctx);

    if (!args.channelId && !args.dmThreadId) {
      throw new Error("Must provide channelId or dmThreadId");
    }

    if (args.text.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must be under ${MAX_MESSAGE_LENGTH} characters`);
    }

    if (args.fileId) {
      const metadata = await ctx.storage.getMetadata(args.fileId);
      if (!metadata) {
        throw new Error("Uploaded file not found");
      }
      if (metadata.size > MAX_FILE_SIZE) {
        throw new Error("File exceeds maximum size of 5MB");
      }
      if (!metadata.contentType || !ALLOWED_MIME_TYPES.includes(metadata.contentType)) {
        await ctx.storage.delete(args.fileId);
        throw new Error("File type not allowed. Only JPEG, PNG, GIF, and WebP images are supported.");
      }
    }

    const messageId = await ctx.db.insert("messages", {
      text: args.text,
      senderId,
      channelId: args.channelId,
      dmThreadId: args.dmThreadId,
      replyToMessageId: args.replyToMessageId,
      fileId: args.fileId,
    });
    return messageId;
  },
});

export const edit = mutation({
  args: {
    messageId: v.id("messages"),
    newText: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== userId) {
      throw new Error("Only the message sender can edit this message");
    }
    if (args.newText.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must be under ${MAX_MESSAGE_LENGTH} characters`);
    }
    await ctx.db.patch(args.messageId, {
      text: args.newText,
      editedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.senderId !== userId) {
      if (message.channelId) {
        const channel = await ctx.db.get(message.channelId);
        if (channel) {
          const membership = await ctx.db
            .query("serverMembers")
            .withIndex("by_server_and_user", (q) =>
              q.eq("serverId", channel.serverId).eq("userId", userId)
            )
            .first();

          if (membership && (membership.role === "owner" || membership.role === "admin")) {
            await ctx.db.delete(args.messageId);
            return;
          }
        }
      }
      throw new Error("Unauthorized to delete message");
    }

    if (message.fileId) {
      await ctx.storage.delete(message.fileId);
    }

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .collect();

    for (const reaction of reactions) {
      await ctx.db.delete(reaction._id);
    }

    await ctx.db.delete(args.messageId);
  },
});
