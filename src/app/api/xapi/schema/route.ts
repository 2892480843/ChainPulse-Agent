import { createXApiService } from "@/lib/server/xapi-service";
import { xapiBadRequest, xapiJson } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action")?.trim() ?? "";

  if (!action) {
    return xapiBadRequest("action is required");
  }

  const result = await createXApiService().getActionSchema(action);
  return xapiJson(result);
}
