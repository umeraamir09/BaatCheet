# Phase 3 Validation Plan: Image & Reaction Basics

This document details the test steps and criteria to verify that Phase 3 is successfully implemented.

## Verification Checklist

### 1. Image Uploads & Display
- [ ] **Drag & Drop / Picker**: Select or drag an image file (.png, .jpg, .webp) into the chat input. Check that the input state handles it correctly.
- [ ] **Upload Success**: Ensure the file is successfully uploaded to Convex storage and a message with the file reference is sent.
- [ ] **Aspect Ratio & Layout Shift**: Verify that rendering images does not cause jarring layouts shifts. The container should load with a placeholder or defined aspect ratio.
- [ ] **Real-time Sync**: Verify that other connected users see the uploaded image inline in the channel/DM stream immediately without manual page refreshes.

### 2. Message Deletion
- [ ] **Author Access**: Verify that only the message author sees the delete option.
- [ ] **Hard Delete Verification**: Delete a message, check the database (via Convex Dashboard or CLI) to confirm that the row/record is completely wiped (not just soft-deleted or hidden).
- [ ] **Real-time Update**: Ensure that the message instantly disappears from the UI of all active, connected users.
- [ ] **Cascade Cleanup**: If a message containing reactions is deleted, verify that there are no orphaned reaction records left in the database.

### 3. Message Reactions
- [ ] **Reaction Toggle**: Add a reaction (e.g., 👍) to a message. Verify that clicking the same emoji again removes the reaction.
- [ ] **Multi-user Reactions**: Have multiple clients react to the same message with the same emoji. Verify that the count increments accurately.
- [ ] **Reaction Tooltip**: Hover over the reaction pill. Verify that a tooltip lists the names of users who reacted.
- [ ] **Real-time Broadcast**: Reactions must appear on other clients instantly.

### 4. Performance & Core Pillars Validation
- [ ] **Memory & CPU Profiling**: Check Electron CPU/RAM usage while scrolling through a chat stream containing multiple large images. Ensure no memory leaks are present.
- [ ] **Zero Lag Verification**: Measure time-to-render for new messages, ensuring image loads do not block thread rendering or degrade app responsiveness.
