# Phase 2: The Texting Backbone - Requirements

## Scope
- Focus exclusively on Phase 2 items (Texting Backbone).
- Implementation of Users, Messages, Channels, and Direct Messages.
- Basic message interactions including replying and editing.

## Context
- From `mission.md`: "Zero Lag. Zero Compromise. Maximum Performance."
- Texting must feel instantaneous with zero perceptible delay in conversations.
- Minimal CPU, RAM, and network bandwidth.

## Decisions
- **Database & State**: Use Convex for real-time messages and backend state.
- **Local State**: Keep Zustand for local UI state management (e.g., currently selected channel, active modals).
- **Tech Stack**: Follow `tech-stack.md` (Electron, React, Tailwind, Vite).
