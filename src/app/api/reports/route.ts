import { NextResponse } from "next/server";
import { listStoredReports } from "@/lib/server/agent-store";
import { authorizeOperator, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import type { AgentCollectionResponse } from "@/lib/agent-types";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://localhost/api/reports")) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "read");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const reports = await listStoredReports();
  return NextResponse.json<AgentCollectionResponse<Report>>({
    ok: true,
    data: reports
  });
}
