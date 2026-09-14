import { getUserFromBearerRequest } from "@/lib/mobile-auth";

export async function GET(req: Request) {
  const user = await getUserFromBearerRequest(req);
  return user ? Response.json({ user }) : Response.json({ error: "Unauthorized" }, { status: 401 });
}
