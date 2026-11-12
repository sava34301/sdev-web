// Requires a signed-in user for paid AI helpers. Returns a 401 Response when the
// caller has no valid session, or null when the request may continue.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function requireUser(req: Request, cors: Record<string, string>): Promise<Response | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const deny = () => new Response(JSON.stringify({ error: "Please sign in to use the AI helpers." }), {
    status: 401, headers: { ...cors, "Content-Type": "application/json" },
  });
  if (!token) return deny();
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims?.sub || data.claims.role !== "authenticated") return deny();
    return null;
  } catch {
    return deny();
  }
}
