import { requireAdmin } from "@/lib/server/admin/adminAuth";
import { userList } from "@/lib/server/admin/stats";
import { errorResponse } from "@/lib/server/http";
import { serviceClient } from "@/lib/server/serviceClient";

export const dynamic = "force-dynamic";

/** Users matching ?q= (part of an email), newest first, with plan and this month's usage. */
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const client = serviceClient();
  if (!client)
    return errorResponse(503, "The Supabase secret key is not configured.");
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 200);
  try {
    return Response.json(
      { users: await userList(client, q) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[admin] user list failed", err);
    return errorResponse(500, "Could not load users.");
  }
}
