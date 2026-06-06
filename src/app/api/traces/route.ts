import { NextResponse } from "next/server";
import { listStoredTraces } from "@/lib/server/agent-store";
import { authorizeOperator, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import type { AgentCollectionResponse } from "@/lib/agent-types";
import type { XApiTrace } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "read");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const url = new URL(request.url);
  const traces = await listStoredTraces(url.searchParams.get("task"));
  return NextResponse.json<AgentCollectionResponse<XApiTrace>>({
    ok: true,
    data: traces
  });
}
