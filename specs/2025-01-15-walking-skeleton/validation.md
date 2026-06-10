# Validation: Walking Skeleton

*Date: 2025-01-15*

## Manual Testing Checklist
*All steps must pass for the phase to be considered complete.*

- [ ] **App Launch**: `npm run dev` successfully launches the Electron window without errors.
- [ ] **Theme Check**: The UI displays in dark mode by default.
- [ ] **Auth Flow**: A new user can click "Sign In", create an account, and be redirected to the app.
- [ ] **Session Persistence**: Closing and reopening the app keeps the user logged in (token persistence).
- [ ] **Logout Flow**: Clicking "Log Out" clears the session and returns the user to the sign-in screen.
- [ ] **Real-Time Chat**: 
  - Open two instances of the app (or one app and a browser tab hitting the local server).
  - User A sends a message.
  - User B sees the message appear instantly without refreshing.

## Automated Testing (Ideal)
- [ ] A simple CI script runs `tsc --noEmit` successfully for both `apps/desktop` and `apps/server`.

## Performance Benchmarks
- [ ] The `electron.exe` process uses < 150MB of RAM at idle.
- [ ] The initial page load in the Electron window takes < 1 second.

## Code Quality
- [ ] All code is formatted with Prettier.
- [ ] All code passes ESLint rules.
- [ ] No `console.log` statements remain in the production build paths.
- [ ] All environment variables are documented in a `.env.example` file.
