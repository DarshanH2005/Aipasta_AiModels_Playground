# Copilot Instructions for AI Pasta

## Project Overview
- **AI Pasta** is an AI model playground for experimenting with and managing multiple AI models (OpenRouter, Hugging Face) via a unified Next.js frontend and API backend.
- The frontend (Next.js + React + Tailwind CSS) is in `aipasta-frontend/`. The backend uses Next.js API routes and MongoDB Atlas.

## Key Architectural Patterns
- **Frontend**: Organized by feature in `src/components/`, `src/pages/`, and `src/lib/`.
  - UI, auth, models, playground, dashboard, admin, and layout components are separated by folder.
  - State management uses React Context and SWR.
  - Custom hooks in `src/hooks/` (e.g., `useAuth.js`, `useModels.js`).
- **Backend**: API routes in `src/pages/api/`.
  - Auth via NextAuth.js (`api/auth/`), model management (`api/models/`), user management (`api/users/`), admin endpoints (`api/admin/`), and AI provider proxies (`api/ai/`).
  - MongoDB connection and models in `src/lib/db/`.
  - AI provider abstraction in `src/lib/ai/providers/` and unified access via `factory.js`.

## Developer Workflows
- **Local Dev**: DO NOT start the backend/frontend automatically - the user manages server startup.
- **Environment**: Copy `.env.local.example` to `.env.local` and fill in secrets (DB, API keys).
- **Database**: Uses MongoDB Atlas. Models defined in `src/lib/db/models/`.
- **Testing**: (If present) tests are colocated or in `__tests__/` folders. No test runner is enforced by default.
- **Deployment**: Deploy via Vercel (frontend) and MongoDB Atlas (database).
- **Component Creation**: When creating components, provide implementation only - DO NOT create demos or example usage.

## Project-Specific Conventions
- **API**: All backend logic is via Next.js API routes. Use SWR/fetch for data fetching.
- **Styling**: Tailwind CSS utility classes. Global styles in `styles/globals.css`.
- **Auth**: NextAuth.js for authentication and session management.
- **AI Providers**: Integrate new providers by extending `src/lib/ai/providers/` and updating the provider factory.
- **Error Handling**: Centralized in `src/lib/utils/errors.js`.
- **Docs**: See `docs/` for API, deployment, and contribution guides.

## Examples
- To add a new AI model: create a provider in `src/lib/ai/providers/`, update model schema in `src/lib/db/models/Model.js`, and expose endpoints in `api/models/`.
- To add a new page: add a file to `src/pages/` and, if needed, a component in `src/components/`.

## References
- See `PROJECT_PLAN.md` for full architecture, database schema, and implementation phases.
- See `docs/API.md` for API details.

---
For any unclear patterns or missing documentation, consult `PROJECT_PLAN.md` or ask the maintainers for guidance.
