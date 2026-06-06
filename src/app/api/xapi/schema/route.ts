import { createXApiService } from "@/lib/server/xapi-service";
import { assertAllowedXApiAction, authorizeOperator, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import { xapiBadRequest, xapiJson } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "xapi");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const url = new URL(request.url);
  const action = url.searchParams.get("action")?.trim() ?? "";

  if (!action) {
    return xapiBadRequest("action is required");
  }
  const actionFailure = assertAllowedXApiAction(action);
  if (actionFailure) return rejectJson(actionFailure);

  const result = await createXApiService().getActionSchema(action);
  return xapiJson(result);
}
