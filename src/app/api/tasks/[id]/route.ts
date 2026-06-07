import { NextResponse } from "next/server";
import { getStoredTaskRun } from "@/lib/server/agent-store";
import { authorizeOperator, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import type { AgentEntityResponse, StoredAgentRun } from "@/lib/agent-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authFailure = authorizeOperator(_request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(_request, "read");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const { id } = await context.params;
  const run = await getStoredTaskRun(decodeURIComponent(id));

  if (!run) {
    return NextResponse.json<AgentEntityResponse<StoredAgentRun>>(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "task not found"
        }
      },
      { status: 404 }
    );
  }

  return NextResponse.json<AgentEntityResponse<StoredAgentRun>>({
    ok: true,
    data: run
  });
}
