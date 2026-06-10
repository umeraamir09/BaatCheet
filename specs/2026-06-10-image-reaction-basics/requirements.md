# Phase 3 Requirements: Image & Reaction Basics

## Context & Objectives
Building on the texting backbone implemented in Phase 2, Phase 3 enhances BaatCheet with rich media support, message management (deletion), and interactive message reactions. The focus remains on keeping the application lightweight, fast, and secure.

## Scope & Features

### 1. Image Upload & Display
*   **Upload Mechanism**: Users can select or drag-and-drop images into the chat input.
*   **Storage**: Leverage **Convex File Storage** instead of AWS S3/MinIO to align with the core tech stack, keeping the architecture unified and reducing overhead.
*   **Rendering**: Display uploaded images inline within the message stream, with proper aspect ratios and loading states to prevent layout shifts.

### 2. Message Deletion (Hard Delete)
*   **Privacy Focus**: To honor user privacy fully, message deletion will be implemented as a **hard-delete** (completely wiping the message record from the database).
*   **Real-time sync**: When a message is deleted, all clients must immediately remove it from their local state/UI.
*   **Security/Permissions**: Only the author of the message can delete it.

### 3. Message Reactions
*   **Emoji Reactions**: Users can react to any message using a set of standard emojis.
*   **Toggles**: Clicking an existing reaction increments the count if the user hasn't reacted yet, or decrements/removes it if they toggle their own reaction off.
*   **Real-time display**: Hovering over a message reveals the reaction picker; active reactions are displayed inline under the message with counts and tooltips showing who reacted.

### 4. UI/UX Refinement
*   Ensure smooth micro-animations for reaction hover states and modal animations.
*   Polish dark-mode styling for all new components using Tailwind CSS.

## Key Technical Decisions
*   **Storage Choice**: Convex File Storage. This avoids introducing AWS SDK/credentials and keeps database-to-file associations simple and transactional.
*   **Deletion Strategy**: Hard-delete from database. Any associated reactions will also be cascade-deleted.
*   **Data Schema Extensions**:
    *   `messages` table: Update schema to include an optional `fileId` (referencing Convex storage) or `fileUrl`.
    *   `reactions` table/field: A way to track emoji reactions per message (e.g., as a nested array or a separate `reactions` table referencing `messageId` and `userId`).
