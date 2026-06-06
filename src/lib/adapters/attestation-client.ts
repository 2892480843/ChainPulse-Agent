import { encodeFunctionData, isAddress, type Address } from "viem";
import { attestation, reports } from "@/lib/mock-data";
import type { EvidenceItem, Report } from "@/lib/types";

export interface AttestationRecord {
  reportHash: string;
  evidenceHash: string;
  txHash: string;
  walletAddress: string;
  block: string;
  timestamp: string;
}

export interface AttestationClient {
  createReportHash(report: Report): Promise<string>;
  createEvidenceHash(evidence: EvidenceItem[]): Promise<string>;
  attestReport(reportId: string, walletAddress: string): Promise<AttestationRecord>;
  getAttestation(reportId: string): Promise<AttestationRecord>;
}

export type AttestationReadinessState = "live ready" | "mock fallback" | "not configured";
export type AttestationClientMode = "live ready" | "mock fallback";
export type WalletMode = "browser wallet detected" | "browser wallet missing";

export interface AttestationConfig {
  chainId?: number;
  contractAddress?: Address;
  explorerBaseUrl?: string;
  contractConfigured: boolean;
  explorerConfigured: boolean;
  walletMode: WalletMode;
}

export interface AttestationReadiness {
  state: AttestationReadinessState;
  detail: string;
  canWrite: boolean;
  missing: string[];
}

export interface SelectedAttestationClient {
  mode: AttestationClientMode;
  client: AttestationClient;
}

export interface ProofVerificationResult {
  reportHash: string;
  evidenceHash: string;
  reportHashMatch: boolean;
  evidenceHashMatch: boolean;
}

export interface PreparedChainAttestation {
  to: Address;
  chainId?: number;
  data: `0x${string}`;
  reportHash: string;
  evidenceHash: string;
  explorerAddressUrl?: string;
}

type AttestationEnv = Record<string, string | undefined>;

const attestationAbi = [
  {
    type: "function",
    name: "attestReport",
    stateMutability: "nonpayable",
    inputs: [
      { name: "reportId", type: "string" },
      { name: "reportHash", type: "bytes32" },
      { name: "evidenceHash", type: "bytes32" }
    ],
    outputs: []
  }
] as const;

export const mockAttestationClient: AttestationClient = {
  async createReportHash(report) {
    return createReportHash(report);
  },

  async createEvidenceHash(evidence) {
    return createEvidenceHash(evidence);
  },

  async attestReport(reportId, walletAddress) {
    const report = findReport(reportId);
    return {
      ...attestation,
      reportHash: await createReportHash(report),
      evidenceHash: await createEvidenceHash(report.evidence),
      walletAddress
    };
  },

  async getAttestation(reportId) {
    const report = findReport(reportId);
    return {
      ...attestation,
      reportHash: await createReportHash(report),
      evidenceHash: await createEvidenceHash(report.evidence)
    };
  }
};

export const chainAttestationClient: AttestationClient = {
  async createReportHash(report) {
    return createReportHash(report);
  },

  async createEvidenceHash(evidence) {
    return createEvidenceHash(evidence);
  },

  async attestReport(reportId, walletAddress) {
    const report = findReport(reportId);
    const prepared = await prepareChainAttestation(report, report.evidence);
    const ethereum = getBrowserEthereum();

    if (!ethereum) {
      throw new Error("browser wallet missing");
    }

    const txHash = (await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: walletAddress,
          to: prepared.to,
          data: prepared.data,
          chainId: prepared.chainId ? `0x${prepared.chainId.toString(16)}` : undefined
        }
      ]
    })) as string;

    return {
      reportHash: prepared.reportHash,
      evidenceHash: prepared.evidenceHash,
      txHash,
      walletAddress,
      block: "pending",
      timestamp: new Date().toISOString()
    };
  },

  async getAttestation(reportId) {
    const report = findReport(reportId);
    const config = readAttestationConfig();

    if (!config.contractConfigured) {
      throw new Error("contract not configured");
    }

    return {
      reportHash: await createReportHash(report),
      evidenceHash: await createEvidenceHash(report.evidence),
      txHash: "not submitted",
      walletAddress: "wallet required",
      block: "not queried",
      timestamp: new Date().toISOString()
    };
  }
};

export function readAttestationConfig(env: AttestationEnv = readPublicAttestationEnv(), options: { detectWallet?: boolean } = {}): AttestationConfig {
  const rawChainId = env.NEXT_PUBLIC_CHAIN_ID?.trim();
  const parsedChainId = rawChainId ? Number(rawChainId) : undefined;
  const rawContractAddress = env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();
  const explorerBaseUrl = env.NEXT_PUBLIC_EXPLORER_BASE_URL?.trim().replace(/\/$/, "");
  const contractAddress = rawContractAddress && isAddress(rawContractAddress) ? rawContractAddress : undefined;

  return {
    chainId: Number.isFinite(parsedChainId) ? parsedChainId : undefined,
    contractAddress,
    explorerBaseUrl: explorerBaseUrl || undefined,
    contractConfigured: Boolean(contractAddress),
    explorerConfigured: Boolean(explorerBaseUrl),
    walletMode: options.detectWallet && getBrowserEthereum() ? "browser wallet detected" : "browser wallet missing"
  };
}

export function readBrowserAttestationConfig() {
  return readAttestationConfig(readPublicAttestationEnv(), { detectWallet: true });
}

export function getAttestationReadiness(config: AttestationConfig = readAttestationConfig()): AttestationReadiness {
  const missing = [config.contractConfigured ? null : "NEXT_PUBLIC_CONTRACT_ADDRESS", config.explorerConfigured ? null : "NEXT_PUBLIC_EXPLORER_BASE_URL", config.walletMode === "browser wallet detected" ? null : "browser wallet"].filter((item): item is string => Boolean(item));

  if (!config.contractConfigured) {
    return {
      state: "not configured",
      detail: "没有合约地址时只展示 mock fallback receipt，不伪造上链写入。",
      canWrite: false,
      missing
    };
  }

  const state = config.explorerConfigured ? "live ready" : "mock fallback";

  return {
    state,
    detail: state === "live ready" ? "合约与 Explorer 已配置；浏览器钱包可用时可发起真实交易。" : `链上 adapter 已准备，但还缺 ${missing.join(", ")}。`,
    canWrite: config.contractConfigured && config.walletMode === "browser wallet detected",
    missing
  };
}

export function selectAttestationClient(config: AttestationConfig = readAttestationConfig()): SelectedAttestationClient {
  if (config.contractConfigured) {
    return {
      mode: "live ready",
      client: chainAttestationClient
    };
  }

  return {
    mode: "mock fallback",
    client: mockAttestationClient
  };
}

export async function createReportHash(report: Report) {
  return createDeterministicHash(toReportHashPayload(report));
}

export async function createEvidenceHash(evidence: EvidenceItem[]) {
  return createDeterministicHash(toEvidencePacket(evidence));
}

export async function verifyProofBundle(report: Report, evidence: EvidenceItem[], record: Pick<AttestationRecord, "reportHash" | "evidenceHash">): Promise<ProofVerificationResult> {
  const [reportHash, evidenceHash] = await Promise.all([createReportHash(report), createEvidenceHash(evidence)]);

  return {
    reportHash,
    evidenceHash,
    reportHashMatch: reportHash.toLowerCase() === record.reportHash.toLowerCase(),
    evidenceHashMatch: evidenceHash.toLowerCase() === record.evidenceHash.toLowerCase()
  };
}

export async function prepareChainAttestation(report: Report, evidence: EvidenceItem[], config: AttestationConfig = readAttestationConfig()): Promise<PreparedChainAttestation> {
  if (!config.contractAddress) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured");
  }

  const [reportHash, evidenceHash] = await Promise.all([createReportHash(report), createEvidenceHash(evidence)]);

  return {
    to: config.contractAddress,
    chainId: config.chainId,
    reportHash,
    evidenceHash,
    data: encodeFunctionData({
      abi: attestationAbi,
      functionName: "attestReport",
      args: [report.id, reportHash as `0x${string}`, evidenceHash as `0x${string}`]
    }),
    explorerAddressUrl: config.explorerBaseUrl ? `${config.explorerBaseUrl}/address/${config.contractAddress}` : undefined
  };
}

export async function createDeterministicHash(value: unknown) {
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `0x${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function toEvidencePacket(evidence: EvidenceItem[]) {
  return evidence.map((item) => ({
    id: item.id,
    source: item.source,
    title: item.title,
    summary: item.summary,
    weight: item.weight
  }));
}

function toReportHashPayload(report: Report) {
  const { reportHash: _reportHash, evidenceHash: _evidenceHash, ...payload } = report;
  return payload;
}

function findReport(reportId: string) {
  const report = reports.find((item) => item.id === reportId);
  if (!report) {
    throw new Error(`report not found: ${reportId}`);
  }
  return report;
}

function getBrowserEthereum(): BrowserEthereum | null {
  if (typeof window === "undefined") return null;
  const ethereum = (window as Window & { ethereum?: BrowserEthereum }).ethereum;
  return ethereum ?? null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

interface BrowserEthereum {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function readPublicAttestationEnv(): AttestationEnv {
  return {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    NEXT_PUBLIC_EXPLORER_BASE_URL: process.env.NEXT_PUBLIC_EXPLORER_BASE_URL
  };
}
