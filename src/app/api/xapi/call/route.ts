import { createXApiService } from "@/lib/server/xapi-service";
import { assertAllowedXApiAction, authorizeOperator, enforceJsonBodySize, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import { isRecord, xapiBadRequest, xapiJson } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "xapi");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const body = await request.json().catch(() => null);
  const bodySizeFailure = enforceJsonBodySize(body, 8192);
  if (bodySizeFailure) return rejectJson(bodySizeFailure);

  if (!isRecord(body)) {
    return xapiBadRequest("JSON body is required");
  }

  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";
  const input = body.input;

  if (!taskId) {
    return xapiBadRequest("taskId is required");
  }
  if (!action) {
    return xapiBadRequest("action is required");
  }
  const actionFailure = assertAllowedXApiAction(action);
  if (actionFailure) return rejectJson(actionFailure);
  if (!isRecord(input)) {
    return xapiBadRequest("input object is required");
  }

  const result = await createXApiService().callAction(action, input, taskId);
  return xapiJson(result);
}
