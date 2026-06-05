import { createXApiService } from "@/lib/server/xapi-service";
import { xapiBadRequest, xapiJson } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return xapiBadRequest("query is required");
  }

  const result = await createXApiService().searchActions(query);
  return xapiJson(result);
}
