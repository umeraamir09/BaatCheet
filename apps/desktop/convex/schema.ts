import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    username: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    discordId: v.optional(v.string()),
    authProvider: v.union(v.literal("discord"), v.literal("password")),
    profileComplete: v.optional(v.boolean()),
  }).index("by_username", ["username"]),

  servers: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    imageUrl: v.optional(v.string()),
  }),

  serverMembers: defineTable({
    serverId: v.id("servers"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  })
    .index("by_server_id", ["serverId"])
    .index("by_user_id", ["userId"])
    .index("by_server_and_user", ["serverId", "userId"]),

  channels: defineTable({
    name: v.string(),
    serverId: v.id("servers"),
    type: v.optional(v.union(v.literal("text"), v.literal("voice"))),
  }).index("by_server_id", ["serverId"]),

  directMessageThreads: defineTable({
    memberIds: v.array(v.id("users")),
  }),

  dmMembers: defineTable({
    dmThreadId: v.id("directMessageThreads"),
    userId: v.id("users"),
  })
    .index("by_user_id", ["userId"])
    .index("by_dm_thread_id", ["dmThreadId"]),

  messages: defineTable({
    text: v.string(),
    senderId: v.id("users"),
    channelId: v.optional(v.id("channels")),
    dmThreadId: v.optional(v.id("directMessageThreads")),
    replyToMessageId: v.optional(v.id("messages")),
    editedAt: v.optional(v.number()),
    fileId: v.optional(v.id("_storage")),
  })
    .index("by_channel_id", ["channelId"])
    .index("by_dm_thread_id", ["dmThreadId"]),

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  })
    .index("by_message_id", ["messageId"])
    .index("by_user_id", ["userId"])
    .index("by_message_and_user_and_emoji", ["messageId", "userId", "emoji"]),

  friends: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_sender_and_receiver", ["senderId", "receiverId"]),

  inviteLinks: defineTable({
    serverId: v.id("servers"),
    code: v.string(),
    createdBy: v.id("users"),
    expiresAt: v.optional(v.number()),
    uses: v.number(),
    maxUses: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_server_id", ["serverId"]),
});
