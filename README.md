# RextFlex AI Backend — Railway

This backend ports the behavior of the original RextFlex AI web app into a standalone API for Expo Android.

## Railway services
Recommended:
1. Node service from this folder
2. PostgreSQL service

Railway will provide DATABASE_URL to the Node service if you link the Postgres service.

## Required environment variables
- DATABASE_URL
- JWT_SECRET
- GROQ_API_KEY
- E2B_API_KEY for project/ZIP generation

Recommended:
- TAVILY_API_KEY for reliable web search
- ALLOWED_ORIGINS set to your Expo/web origins as needed

## Groq model mapping
Silicon -> openai/gpt-oss-20b
Titan -> openai/gpt-oss-120b (default)
Apex -> qwen/qwen3.8-27b

The server does not expose provider model IDs to the Android client.

## E2B ZIP generation
The implementation mirrors the original:
- shared per-request sandbox
- writeFile one file per call
- max 6 setup commands
- 90s command timeout
- 10min sandbox lifetime
- excludes node_modules and .git
- 8 MiB default archive limit
- generated ZIP stored in Postgres bytea
- protected download route

## Web search
Tavily first, DuckDuckGo HTML fallback if TAVILY_API_KEY is not set.

## Run
npm install
npm run dev

Health:
GET /health

## Production
Deploy this folder as a Railway service and set the same environment variables from `.env.example`.
