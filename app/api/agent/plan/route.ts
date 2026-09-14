import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { getUserFromBearerRequest } from "@/lib/mobile-auth";
import { getUserFromRequest } from "@/lib/session";
import { safetyCheck, sanitizePlan, type AgentPlan } from "@/lib/agent/safety";

const groq = createOpenAICompatible({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  name: "groq",
});

const MODEL = process.env.GROQ_AGENT_MODEL || "openai/gpt-oss-20b";

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(req: Request) {
  const user = req.headers.get("authorization")?.startsWith("Bearer ")
    ? await getUserFromBearerRequest(req)
    : await getUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const command = String(body.command ?? "").trim();
  if (!command) return Response.json({ error: "Command is required" }, { status: 400 });

  const guard = safetyCheck(command);
  if (!guard.safe) {
    const refusal: AgentPlan = {
      safe: false,
      refusalReason: guard.reason,
      summary: "SCOOTY refused the request.",
      actions: [],
      confirmations: [],
    };
    return Response.json(refusal);
  }

  const prompt = `You are RextFlex AI's Android Device Control planner. Produce ONLY JSON.
User command: ${command}

Allowed actions ONLY: launch_app, tap_text, tap_point, swipe, input_text, back, home, open_url, observe, screenshot, send_message, delete_data, purchase, change_security, grant_permission, change_device_setting.
Never invent package names when uncertain; prefer a human-readable app name in args.packageOrName.
Never include passwords, OTPs, tokens, private keys, or security-bypass instructions in args.
For high-impact actions (send_message, delete_data, purchase, change_security, grant_permission, change_device_setting), set requiresConfirmation=true.
For message requests, create a send_message action for the final send step, not an automatic tap without confirmation.
Use small, explicit steps. Do not add artificial waits.
JSON shape:
{"safe":true,"summary":"...","actions":[{"id":"1","type":"launch_app","args":{"packageOrName":"WhatsApp"},"reason":"...","requiresConfirmation":false}],"confirmations":[]}`;

  try {
    const result = await generateText({
      model: groq(MODEL),
      temperature: 0,
      maxOutputTokens: 1800,
      prompt,
    });
    const plan = sanitizePlan(parseJson(result.text) as AgentPlan);
    return Response.json(plan);
  } catch (error) {
    console.error("agent plan error", error);
    return Response.json({ error: "Agent planner failed" }, { status: 502 });
  }
}
