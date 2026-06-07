import type { AiHealthStatus } from "@/lib/ai-types";

export async function fetchAiHealth() {
  const response = await fetch("/api/ai/health", {
    cache: "no-store",
    credentials: "same-origin"
  });
  if (!response.ok) throw new Error(`AI health failed: ${response.status}`);
  const body = (await response.json()) as { ok: boolean; data?: AiHealthStatus };
  if (!body.ok || !body.data) throw new Error("invalid AI health response");
  return body.data;
}
