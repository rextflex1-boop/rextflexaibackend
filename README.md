# RextFlex AI Backend — Railway-ready

This package is the standalone backend for the RextFlex AI Expo Android app. It preserves the original app architecture: PostgreSQL persistence, Groq model tiers, Tavily/DuckDuckGo search, E2B project/ZIP generation, protected file download, personas/settings, and Agent task events.

## Important build fix
The migration code now uses the Neon `Pool` query API for DDL and the Neon tagged-template client for parameterized application queries. Express `Request.user` is explicitly typed in `src/express.d.ts`. This fixes the TypeScript errors shown in the previous Railway deployment.

## Railway
Deploy this folder as a Node service and attach/link a Railway PostgreSQL service.

Required variables:
- `DATABASE_URL`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `E2B_API_KEY` (needed for project/ZIP generation)

Recommended:
- `TAVILY_API_KEY`
- `ALLOWED_ORIGINS`

Optional Google auth variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BETTER_AUTH_URL`

### Model mapping
- Silicon → `openai/gpt-oss-20b`
- Titan → `openai/gpt-oss-120b` (default)
- Apex → `qwen/qwen3.8-27b`

The Android client sends only the tier name; provider model IDs remain backend-side.

### E2B ZIP flow
- one shared sandbox per build
- `writeFile` one file per call
- setup commands
- ZIP creation
- default 8 MiB output cap
- ZIP stored as PostgreSQL `bytea`
- authenticated download endpoint

### Search
Tavily is used when `TAVILY_API_KEY` is configured. A DuckDuckGo fallback is used otherwise.

### Health check
`GET /health`

Expected response contains `ok: true`.

### Local
```bash
npm install
npm run build
npm start
```
