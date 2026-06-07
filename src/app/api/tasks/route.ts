import { NextResponse } from "next/server";
import { listStoredTasks } from "@/lib/server/agent-store";
import { authorizeOperator, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import type { AgentCollectionResponse } from "@/lib/agent-types";
import type { RunningTask } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://localhost/api/tasks")) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "read");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const tasks = await listStoredTasks();
  return NextResponse.json<AgentCollectionResponse<RunningTask>>({
    ok: true,
    data: tasks
  });
}
