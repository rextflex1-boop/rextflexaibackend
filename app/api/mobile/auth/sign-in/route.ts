import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password) return Response.json({ error: "Email and password are required" }, { status: 400 });
  try {
    const result = await auth.api.signInEmail({ body: { email, password } });
    const session = result?.session;
    const user = result?.user;
    if (!session || !user) return Response.json({ error: "Invalid credentials" }, { status: 401 });
    return Response.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: { id: user.id, name: user.name, email: user.email, image: user.image },
    });
  } catch (error) {
    console.error("mobile sign-in", error);
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
