# RextFlex AI Backend — Groq Edition

This package is based on the original RextFlex AI ZIP. The AI provider remains **Groq**. NVIDIA is not used.

## Required environment variables

- `GROQ_API_KEY`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

Optional:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `E2B_API_KEY`
- `GROQ_AGENT_MODEL` (default: `openai/gpt-oss-20b`)

## Database

Run `db/schema.sql` against Neon/Postgres.

## Vercel

Deploy this folder as the backend. After deployment, give the Android app the final URL, for example:

`https://your-backend.vercel.app`

The Android app calls `/api/mobile/auth/*` and `/api/agent/plan`.

## Groq model tiers preserved from the original app

- Silicon → `openai/gpt-oss-20b`
- Titan → `openai/gpt-oss-120b`
- Apex → `qwen/qwen3.8-27b`

No NVIDIA dependency is used.
