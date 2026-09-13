# RextFlex AI — Backend

Private server for the Expo mobile app. Keep all provider secrets here, never inside the APK.

## Railway
Set the values from `.env.example` in Railway Variables, especially:
- `GROQ_API_KEY`
- `GROQ_MODEL_SILICON`
- `GROQ_MODEL_TITAN`
- `GROQ_MODEL_APEX`

Start command:
```bash
npm start
```

Health check:
```text
GET /health
```

Chat endpoint:
```text
POST /api/chat
```

The Expo app only needs:
```env
EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN
```
