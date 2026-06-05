import { createXApiService } from "@/lib/server/xapi-service";
import { xapiJson } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await createXApiService().healthCheck();
  return xapiJson(result);
}
