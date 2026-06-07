export type OperatorSessionMode = "authenticated" | "locked" | "unconfigured";

export interface OperatorSessionStatus {
  configured: boolean;
  authenticated: boolean;
  mode: OperatorSessionMode;
  detail?: string;
}

type OperatorSessionResponse = {
  ok: boolean;
  data?: OperatorSessionStatus;
  error?: {
    code: string;
    message: string;
  };
};

export async function fetchOperatorSession() {
  return requestOperatorSession("/api/operator/session", {
    method: "GET"
  });
}

export async function openOperatorSession(token: string) {
  return requestOperatorSession("/api/operator/session", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ token })
  });
}

export async function closeOperatorSession() {
  return requestOperatorSession("/api/operator/session", {
    method: "DELETE"
  });
}

async function requestOperatorSession(url: string, init: RequestInit) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...init
  });
  const body = (await response.json().catch(() => null)) as OperatorSessionResponse | null;
  if (!response.ok || !body?.ok || !body.data) {
    const message = body?.error?.message ?? `operator session failed: ${response.status}`;
    throw new Error(message);
  }
  return body.data;
}
