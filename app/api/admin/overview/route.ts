import { requireAdmin } from "@/lib/server/admin/adminAuth";
import {
  allUsers,
  overview,
  recentAudit,
  recentFailures,
} from "@/lib/server/admin/stats";
import { checkServices, configuredSettings } from "@/lib/server/admin/status";
import { getAppSettings } from "@/lib/server/appSettings";
import { errorResponse } from "@/lib/server/http";
import { serviceClient } from "@/lib/server/serviceClient";

export const dynamic = "force-dynamic";

/** Everything the admin console's dashboard shows, in one request. */
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const client = serviceClient();
  if (!client)
    return errorResponse(503, "The Supabase secret key is not configured.");

  try {
    const [stats, services, settings, users, audit] = await Promise.all([
      overview(client),
      checkServices(),
      getAppSettings(),
      allUsers(client),
      recentAudit(client),
    ]);
    const failures = await recentFailures(client, users);
    return Response.json(
      {
        stats,
        services,
        settings,
        failures,
        audit,
        config: configuredSettings(),
        admin: admin.email,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[admin] overview failed", err);
    return errorResponse(
      500,
      err instanceof Error ? err.message : "Could not load the dashboard.",
    );
  }
}
