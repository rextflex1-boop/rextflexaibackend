# Device control backend

`POST /api/device/plan` creates a strict JSON action plan. It never executes device actions. Execution stays on the user's Android device after permission + confirmation.

Set `GROQ_DEVICE_MODEL` on Railway to the model you want to use for planning. Keep `GROQ_API_KEY`, `DATABASE_URL`, and `E2B_API_KEY` server-side only.
