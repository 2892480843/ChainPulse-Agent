import { NextResponse } from "next/server";
import { operatorCookieName, readOperatorSession } from "@/lib/server/api-guard";
import { isRecord } from "@/lib/server/xapi-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://localhost/api/operator/session")) {
  return NextResponse.json({
    ok: true,
    data: readOperatorSession(request)
  });
}

export async function POST(request: Request) {
  const configuredToken = process.env.AGENT_OPERATOR_TOKEN?.trim();
  if (!configuredToken) {
    return NextResponse.json({
      ok: true,
      data: {
        configured: false,
        authenticated: true,
        mode: "unconfigured",
        detail: "AGENT_OPERATOR_TOKEN is not configured"
      }
    });
  }

  const body = await request.json().catch(() => null);
  const token = isRecord(body) && typeof body.token === "string" ? body.token.trim() : "";

  if (token !== configuredToken) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "invalid operator token",
          recoverable: true
        }
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    data: {
      configured: true,
      authenticated: true,
      mode: "authenticated"
    }
  });
  response.cookies.set(operatorCookieName, configuredToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
  return response;
}

export async function DELETE() {
  const configured = Boolean(process.env.AGENT_OPERATOR_TOKEN?.trim());
  const response = NextResponse.json({
    ok: true,
    data: {
      configured,
      authenticated: !configured,
      mode: configured ? "locked" : "unconfigured"
    }
  });
  response.cookies.set(operatorCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
  return response;
}
