import { createXApiService } from "@/lib/server/xapi-service";
import { authorizeOperator, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import { xapiJson } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://localhost/api/xapi/health")) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "xapi", 120);
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const result = await createXApiService().healthCheck();
  return xapiJson(result);
}
