import { createXApiService } from "@/lib/server/xapi-service";
import { authorizeOperator, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import { xapiBadRequest, xapiJson } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "xapi");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return xapiBadRequest("query is required");
  }
  if (query.length > 160) {
    return xapiBadRequest("query must be 160 characters or fewer");
  }

  const result = await createXApiService().searchActions(query);
  return xapiJson(result);
}
