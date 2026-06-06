import { NextResponse } from "next/server";
import { saveReportAttestation } from "@/lib/server/agent-store";
import { authorizeOperator, enforceJsonBodySize, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import { isRecord } from "@/lib/server/xapi-route";
import type { AgentEntityResponse } from "@/lib/agent-types";
import type { Report, ReportAttestation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "read");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const body = await request.json().catch(() => null);
  const bodySizeFailure = enforceJsonBodySize(body, 8192);
  if (bodySizeFailure) return rejectJson(bodySizeFailure);

  const attestation = parseReportAttestation(body);
  if (!attestation) {
    return NextResponse.json<AgentEntityResponse<Report>>(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "valid attestation record is required"
        }
      },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const report = await saveReportAttestation(decodeURIComponent(id), attestation);

  if (!report) {
    return NextResponse.json<AgentEntityResponse<Report>>(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "report not found"
        }
      },
      { status: 404 }
    );
  }

  return NextResponse.json<AgentEntityResponse<Report>>({
    ok: true,
    data: report
  });
}

function parseReportAttestation(value: unknown): ReportAttestation | null {
  if (!isRecord(value)) return null;
  const reportHash = readString(value.reportHash);
  const evidenceHash = readString(value.evidenceHash);
  const txHash = readString(value.txHash);
  const walletAddress = readString(value.walletAddress);
  const block = readString(value.block);
  const timestamp = readString(value.timestamp);

  if (!reportHash || !evidenceHash || !txHash || !walletAddress || !block || !timestamp) return null;

  return {
    reportHash,
    evidenceHash,
    txHash,
    walletAddress,
    block,
    timestamp,
    chainId: typeof value.chainId === "number" ? value.chainId : undefined,
    contractAddress: readString(value.contractAddress),
    reportId: readString(value.reportId),
    metadataURI: readString(value.metadataURI),
    explorerTxUrl: readString(value.explorerTxUrl),
    onChainStatus: value.onChainStatus === "confirmed" || value.onChainStatus === "mismatch" || value.onChainStatus === "pending" ? value.onChainStatus : undefined
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

