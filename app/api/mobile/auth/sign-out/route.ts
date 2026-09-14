import { neon } from "@neondatabase/serverless";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !process.env.DATABASE_URL) return Response.json({ ok: true });
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`delete from "session" where token = ${token}`;
  } catch (error) {
    console.error("mobile sign-out", error);
  }
  return Response.json({ ok: true });
}
