import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '8mb' }));

const models = {
  silicon: process.env.GROQ_MODEL_SILICON || 'openai/gpt-oss-20b',
  titan: process.env.GROQ_MODEL_TITAN || 'openai/gpt-oss-120b',
  apex: process.env.GROQ_MODEL_APEX || 'qwen/qwen3.8-27b',
};

app.get('/health', (_req, res) => res.json({ ok: true, service: 'rextflex-ai-backend' }));

function normalizeMessages(items) {
  return (Array.isArray(items) ? items : []).slice(-40).map((m) => {
    const out = { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text || '' };
    // Optional image attachment. If the client later sends a data URI, pass it as a multimodal user message.
    if (m.role === 'user' && m.imageUri && /^data:image\//.test(m.imageUri)) {
      out.content = [
        { type: 'text', text: m.text || 'Please analyze the attached image.' },
        { type: 'image_url', image_url: { url: m.imageUri } },
      ];
    }
    return out;
  });
}

app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the backend.' });
    const { messages, modelTier = 'titan', thinkingEnabled = true, webSearchEnabled = true } = req.body || {};
    const model = models[modelTier] || models.titan;
    const system = [
      'You are RextFlex AI, a helpful mobile AI assistant.',
      'Answer clearly and directly. Match the user\'s language and tone.',
      thinkingEnabled ? 'Use extra reasoning internally when the model supports it. Do not reveal private chain-of-thought.' : 'Prefer concise direct answers.',
      webSearchEnabled ? 'You may use current knowledge available to you, but do not invent live web results.' : 'Do not claim to have browsed the web.',
    ].join(' ');

    const body = {
      model,
      messages: [{ role: 'system', content: system }, ...normalizeMessages(messages)],
      temperature: 0.6,
      max_tokens: Number(process.env.MAX_OUTPUT_TOKENS || 2048),
    };

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const raw = await upstream.text();
    let data = null; try { data = JSON.parse(raw); } catch {}
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || raw || 'Upstream AI request failed.' });
    }
    const text = data?.choices?.[0]?.message?.content || '';
    return res.json({ text, model });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Backend error while contacting the AI provider.' });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`RextFlex backend listening on ${port}`));
