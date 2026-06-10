# Phase 3 Implementation Plan: Image & Reaction Basics

This plan outlines the sequential tasks required to implement image uploading, hard-deleting of messages, and emoji reactions.

## Task Groups

### 1. Convex File Storage Setup
1. Define a Convex mutation to generate upload URLs (using `mutationCtx.storage.generateUploadUrl()`).
2. Add a Convex query/mutation to associate an uploaded file metadata/URL with a message.
3. Update the `messages` table schema in Convex (`convex/schema.ts` or equivalent) to support optional image fields (e.g., `storageId: v.optional(v.string())` and `format: v.optional(v.string())`).

### 2. Frontend Image Upload & Display UI
1. Implement a file input picker and drag-and-drop handler in the Chat Input component.
2. Integrate client-side upload logic: request upload URL from Convex, POST the file to that URL, and send the message with the resulting storage ID.
3. Update the Message rendering component to detect storage IDs, fetch display URLs via Convex queries, and render inline images with CSS aspect-ratio constraints to prevent layout shifts.

### 3. Message Hard Deletion
1. Implement a Convex mutation `deleteMessage` that checks if the current user is the author and deletes the message from the database.
2. Add a deletion UI trigger (trash icon on message hover, visible only to the message author).
3. Ensure cascading cleanups: deleted messages should automatically remove associated reactions, and we should optionally clean up orphaned files from Convex storage.

### 4. Message Reactions Database & API
1. Extend the schema to track message reactions (e.g., a `reactions` table mapping `messageId`, `userId`, and `emoji`).
2. Implement a Convex mutation `toggleReaction(messageId, emoji)` to add a reaction if not present, or remove it if already present for the calling user.
3. Expose reactions in the message queries so they are returned in real-time.

### 5. Message Reactions UI
1. Create a Reaction Picker component (a small popover showing standard emojis: 👍, ❤️, 😂, 😮, 😢, 🔥).
2. Add a hover trigger to message bubbles to open the reaction picker.
3. Render existing reactions underneath each message as compact pills showing the emoji and count.
4. Add tooltip interactions showing lists of usernames who reacted with each emoji.

### 6. UI Refinement & Polish
1. Add smooth micro-animations for hover states on reactions, message popovers, and upload previews.
2. Review layout shifts, slow-loading images, and connection stability, ensuring the "Zero Lag" promise is upheld.
