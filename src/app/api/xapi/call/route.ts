import { createXApiService } from "@/lib/server/xapi-service";
import { isRecord, xapiBadRequest, xapiJson } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

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
  if (!isRecord(input)) {
    return xapiBadRequest("input object is required");
  }

  const result = await createXApiService().callAction(action, input, taskId);
  return xapiJson(result);
}
