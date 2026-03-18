# Hafrik-pro Copilot Agent Instructions

## Build & Run Commands
- Use Expo commands from package.json:
  - `expo start --dev-client` (development)
  - `expo run:android` (Android)
  - `expo run:ios` (iOS)
  - `expo start --web` (Web)
- EAS build profiles in eas.json: development, preview, production.

## Architecture & Component Boundaries
- React Native + Expo core.
- Key folders:
  - `src/components/`: UI components
  - `src/pages/`: Screens/views
  - `src/controllers/`: Business logic
  - `src/helpers/`: Utilities
  - `context/`: Global state (contexts)
  - `hooks/`: Custom hooks
  - `api/`: API wrappers
  - `theme/`: Styling

## Project Conventions
- Folder-based separation: components, controllers, helpers, hooks, pages.
- Use contexts for global state ([context/notificationcontext.tsx], [src/AuthContext.js]).
- Expo plugins and custom icons configured in app.json.

## Potential Pitfalls
- No automated test scripts; testing is manual.
- Controller logic may be tightly coupled to API responses.
- Custom cache/media handling in helpers.
- EAS versioning: auto-increment for production, manual for dev/preview.

## Agent Productivity Tips
- Use context and hooks for global state and side effects.
- Controllers encapsulate business logic; helpers provide utilities.
- Follow folder conventions for new features.
- Check package.json and app.json for build/run details.
- Be aware of missing test automation and custom cache/media handling.

---

## Example Prompts
- "How do I build for Android?"
- "Where is the auth context implemented?"
- "Show me the pattern for background uploads."
- "Add a new screen to src/pages."

## Next Customizations
- /create-agent: Define specialized agents for frontend, backend, or testing.
- /create-hook: Add custom hooks for new global state or side effects.
- /create-skill: Document project-specific skills (e.g., Expo build, cache management).

---

For deeper dives or updates, review this file and suggest improvements as the project evolves.