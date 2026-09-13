# RextFlex AI Backend

This Railway-ready backend keeps all provider and database secrets off the APK.

Features copied from the original RextFlex AI web project:
- email/password auth + persistent bearer sessions
- Google OAuth handoff endpoint (optional; configure credentials)
- persistent chat sessions/messages
- model tiers: Silicon / Titan / Apex
- thinking toggle / reasoning effort
- web search toggle via Groq Compound Mini
- image chat input
- per-user tone + personas + active persona
- session rename/delete/new chat
- E2B project builder that creates a ZIP and returns a chat-visible download URL
- generated ZIP storage in Postgres
- secure user-scoped file downloads

Run `db/schema.sql` against your Neon/Postgres database.
Then set env vars on Railway and deploy.


## Reliable E2B ZIP generation
`POST /api/build` now generates a bounded set of files, writes them to E2B, creates `/home/user/project.zip` deterministically, validates the ZIP size, stores it in `generated_files`, and returns a `files` manifest plus build log. Arbitrary AI setup commands are not executed.
