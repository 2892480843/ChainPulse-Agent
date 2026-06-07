import { NextResponse } from "next/server";
import { createAiService } from "@/lib/server/ai-service";
import { authorizeOperator, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import type { AiHealthStatus } from "@/lib/ai-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://localhost/api/ai/health")) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "ai");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  return NextResponse.json<{ ok: true; data: AiHealthStatus }>({
    ok: true,
    data: createAiService().getHealth()
  });
}
