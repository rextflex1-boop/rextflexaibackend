import { neon } from "@neondatabase/serverless";

export async function getUserFromBearerRequest(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const databaseUrl = process.env.DATABASE_URL;
  if (!token || !databaseUrl) return null;

  const sql = neon(databaseUrl);
  const rows = await sql`
    select u.id, u.name, u.email
    from "session" s
    join "user" u on u.id = s."userId"
    where s.token = ${token} and s."expiresAt" > now()
    limit 1
  `;
  return rows[0] ?? null;
}
