import { decodeEventLog, decodeFunctionResult, encodeFunctionData, isAddress, type Address } from "viem";
import type { EvidenceItem, Report } from "@/lib/types";

export interface AttestationRecord {
  reportHash: string;
  evidenceHash: string;
  txHash: string;
  walletAddress: string;
  block: string;
  timestamp: string;
  chainId?: number;
  contractAddress?: Address;
  reportId?: string;
  metadataURI?: string;
  explorerTxUrl?: string;
  explorerAddressUrl?: string;
  onChainVerification?: ChainAttestationVerification;
}

export interface AttestationClient {
  createReportHash(report: Report): Promise<string>;
  createEvidenceHash(evidence: EvidenceItem[]): Promise<string>;
  attestReport(reportId: string, walletAddress: string): Promise<AttestationRecord>;
  getAttestation(reportId: string): Promise<AttestationRecord>;
}

export type AttestationReadinessState = "live ready" | "read only" | "not configured";
export type AttestationClientMode = "live ready" | "mock fallback" | "not configured";
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
  metadataURI: string;
  functionSignature: string;
  explorerAddressUrl?: string;
}

export interface ChainAttestationVerification {
  status: "confirmed" | "mismatch";
  reportId: string;
  blockNumber: string;
  eventMatched: boolean;
  checkedAt: string;
  creator?: string;
  fieldMatches: {
    reportHash: boolean;
    evidenceHash: boolean;
    topic: boolean;
    riskScore: boolean;
    alphaScore: boolean;
    verdict: boolean;
    metadataURI: boolean;
  };
}

type AttestationEnv = Record<string, string | undefined>;

export const signalAttestationAbi = [
  {
    type: "event",
    name: "ReportAttested",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "topic", type: "string", indexed: false },
      { name: "riskScore", type: "uint8", indexed: false },
      { name: "alphaScore", type: "uint8", indexed: false },
      { name: "verdict", type: "string", indexed: false },
      { name: "reportHash", type: "bytes32", indexed: false },
      { name: "evidenceHash", type: "bytes32", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
      { name: "createdAt", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "reportHash", type: "bytes32" },
      { name: "evidenceHash", type: "bytes32" },
      { name: "topic", type: "string" },
      { name: "riskScore", type: "uint8" },
      { name: "alphaScore", type: "uint8" },
      { name: "verdict", type: "string" },
      { name: "metadataURI", type: "string" }
    ],
    outputs: [{ name: "reportId", type: "uint256" }]
  },
  {
    type: "function",
    name: "reportCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getReport",
    stateMutability: "view",
    inputs: [{ name: "reportId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "reportHash", type: "bytes32" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "topic", type: "string" },
          { name: "riskScore", type: "uint8" },
          { name: "alphaScore", type: "uint8" },
          { name: "verdict", type: "string" },
          { name: "metadataURI", type: "string" },
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint256" }
        ]
      }
    ]
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
    const reportHash = `0x${"1".repeat(64)}`;
    const evidenceHash = `0x${"2".repeat(64)}`;
    return {
      reportHash,
      evidenceHash,
      txHash: `0x${"0".repeat(64)}`,
      walletAddress,
      block: "mock",
      timestamp: new Date().toISOString()
    };
  },

  async getAttestation(reportId) {
    const { reports } = await import("@/lib/mock-data");
    const report = reports.find((r) => r.id === reportId);
    if (!report) {
      throw new Error(`mock attestation: report ${reportId} not found in mock data`);
    }
    return {
      reportHash: report.reportHash,
      evidenceHash: report.evidenceHash,
      txHash: `0x${"0".repeat(64)}`,
      walletAddress: "0x0000000000000000000000000000000000000000",
      block: "mock",
      timestamp: new Date().toISOString(),
      reportId
    };
  }
};

export const unavailableAttestationClient: AttestationClient = {
  async createReportHash(report) {
    return createReportHash(report);
  },

  async createEvidenceHash(evidence) {
    return createEvidenceHash(evidence);
  },

  async attestReport(reportId) {
    throw new Error(`real attestation is not configured for report: ${reportId}`);
  },

  async getAttestation(reportId) {
    throw new Error(`real attestation is not configured for report: ${reportId}`);
  }
};

export const chainAttestationClient: AttestationClient = {
  async createReportHash(report) {
    return createReportHash(report);
  },

  async createEvidenceHash(evidence) {
    return createEvidenceHash(evidence);
  },

  async attestReport(reportId) {
    throw new Error(`report object is required for user-wallet attestation: ${reportId}`);
  },

  async getAttestation(reportId) {
    throw new Error(`stored attestation receipt must be loaded from the backend: ${reportId}`);
  }
};

export async function attestReportOnChain(report: Report, walletAddress: string): Promise<AttestationRecord> {
  const config = readAttestationConfig();
  const prepared = await prepareChainAttestation(report, report.evidence, config);
  const ethereum = getBrowserEthereum();

  if (!ethereum) {
    throw new Error("browser wallet missing");
  }

  await assertBrowserChain(ethereum, config.chainId);

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
  const receipt = await waitForTransactionReceipt(ethereum, txHash);
  const event = findReportAttestedEvent(prepared.to, receipt.logs);
  if (!event) {
    throw new Error("ReportAttested event was not found in the transaction receipt");
  }

  const chainReportId = event.args.reportId;
  const chainReport = await readChainReport(ethereum, prepared.to, chainReportId);
  const onChainVerification = verifyChainReport(report, prepared, receipt, event, chainReport);

  return {
    reportHash: prepared.reportHash,
    evidenceHash: prepared.evidenceHash,
    txHash,
    walletAddress,
    block: receipt.blockNumber ? hexToDecimalString(receipt.blockNumber) : "confirmed",
    timestamp: new Date().toISOString(),
    chainId: prepared.chainId,
    contractAddress: prepared.to,
    reportId: chainReportId.toString(),
    metadataURI: prepared.metadataURI,
    explorerTxUrl: config.explorerBaseUrl ? `${config.explorerBaseUrl}/tx/${txHash}` : undefined,
    explorerAddressUrl: prepared.explorerAddressUrl,
    onChainVerification
  };
}

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
  if (!config.contractConfigured) {
    return {
      state: "not configured",
      detail: "缺少合约地址时不能上链，页面不会生成本地假回执。",
      canWrite: false,
      missing: ["NEXT_PUBLIC_CONTRACT_ADDRESS", ...(!config.explorerConfigured ? ["NEXT_PUBLIC_EXPLORER_BASE_URL"] : []), ...(config.walletMode !== "browser wallet detected" ? ["browser wallet"] : [])]
    };
  }

  const walletReady = config.walletMode === "browser wallet detected";
  const canWrite = walletReady;
  const state: AttestationReadinessState = config.contractConfigured ? "live ready" : "not configured";
  const missing = [...(!config.explorerConfigured ? ["NEXT_PUBLIC_EXPLORER_BASE_URL"] : []), ...(!walletReady ? ["browser wallet"] : [])];

  return {
    state,
    detail: walletReady ? "合约与浏览器钱包已就绪，可由用户钱包发起真实交易。" : `合约已配置，连接钱包后可上链。`,
    canWrite,
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
  const metadataURI = createReportMetadataURI(report);

  return {
    to: config.contractAddress,
    chainId: config.chainId,
    reportHash,
    evidenceHash,
    metadataURI,
    functionSignature: "attest(bytes32,bytes32,string,uint8,uint8,string,string)",
    data: encodeFunctionData({
      abi: signalAttestationAbi,
      functionName: "attest",
      args: [
        reportHash as `0x${string}`,
        evidenceHash as `0x${string}`,
        report.topic,
        report.riskScore,
        report.alphaScore,
        report.verdict,
        metadataURI
      ]
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
    weight: item.weight,
    ...(item.traceId ? { traceId: item.traceId } : {}),
    ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
    ...(item.sourceTimestamp ? { sourceTimestamp: item.sourceTimestamp } : {}),
    ...(item.rawId ? { rawId: item.rawId } : {}),
    ...(typeof item.confidence === "number" ? { confidence: item.confidence } : {}),
    ...(item.sourceMode ? { sourceMode: item.sourceMode } : {})
  }));
}

function toReportHashPayload(report: Report) {
  // Exclude fields not present when the hash was originally computed
  const { reportHash: _r, evidenceHash: _e, attestation: _a, ...payload } = report;
  return payload;
}

export function createReportMetadataURI(report: Report) {
  return `chainpulse://reports/${report.id}`;
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

interface BrowserReceiptLog {
  address: string;
  data: `0x${string}`;
  topics: [`0x${string}`, ...`0x${string}`[]];
}

interface BrowserTransactionReceipt {
  transactionHash: string;
  blockNumber?: `0x${string}`;
  status?: `0x${string}`;
  logs: BrowserReceiptLog[];
}

interface DecodedReportAttestedEvent {
  args: {
    reportId: bigint;
    creator?: string;
    topic?: string;
    riskScore?: number;
    alphaScore?: number;
    verdict?: string;
    reportHash?: string;
    evidenceHash?: string;
    metadataURI?: string;
  };
}

interface ChainReportRecord {
  reportHash: string;
  evidenceHash: string;
  topic: string;
  riskScore: number;
  alphaScore: number;
  verdict: string;
  metadataURI: string;
  creator?: string;
}

async function assertBrowserChain(ethereum: BrowserEthereum, expectedChainId?: number) {
  if (!expectedChainId) return;
  const activeChainId = (await ethereum.request({ method: "eth_chainId" })) as string;
  if (Number(activeChainId) === expectedChainId) return;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${expectedChainId.toString(16)}` }]
    });
  } catch (switchError: unknown) {
    const code = (switchError as { code?: number })?.code;
    if (code === 4902) {
      // Chain not added — add Sepolia
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${expectedChainId.toString(16)}`,
          chainName: "Sepolia",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org", "https://rpc.sepolia.ethpandaops.io"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"]
        }]
      });
    } else {
      throw new Error(`wallet chain mismatch: please switch to Sepolia (chain ${expectedChainId})`);
    }
  }
}

async function waitForTransactionReceipt(ethereum: BrowserEthereum, txHash: string): Promise<BrowserTransactionReceipt> {
  const startedAt = Date.now();
  const timeoutMs = 120_000;

  while (Date.now() - startedAt < timeoutMs) {
    const receipt = (await ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    })) as BrowserTransactionReceipt | null;

    if (receipt) {
      if (receipt.status && receipt.status !== "0x1") {
        throw new Error(`attestation transaction failed: ${receipt.status}`);
      }
      return receipt;
    }
    await sleep(2_000);
  }

  throw new Error("attestation transaction was submitted but receipt was not confirmed within 120s");
}

function findReportAttestedEvent(contractAddress: Address, logs: BrowserReceiptLog[]): DecodedReportAttestedEvent | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: signalAttestationAbi,
        data: log.data,
        topics: log.topics
      });
      if (decoded.eventName === "ReportAttested") {
        return decoded as unknown as DecodedReportAttestedEvent;
      }
    } catch {
      // Ignore logs from the same tx that do not match the attestation event.
    }
  }
  return null;
}

async function readChainReport(ethereum: BrowserEthereum, contractAddress: Address, reportId: bigint): Promise<ChainReportRecord> {
  const data = encodeFunctionData({
    abi: signalAttestationAbi,
    functionName: "getReport",
    args: [reportId]
  });
  const raw = (await ethereum.request({
    method: "eth_call",
    params: [
      {
        to: contractAddress,
        data
      },
      "latest"
    ]
  })) as `0x${string}`;
  const decoded = decodeFunctionResult({
    abi: signalAttestationAbi,
    functionName: "getReport",
    data: raw
  });

  return normalizeChainReport(decoded);
}

function normalizeChainReport(value: unknown): ChainReportRecord {
  if (Array.isArray(value)) {
    return {
      reportHash: String(value[0]),
      evidenceHash: String(value[1]),
      topic: String(value[2]),
      riskScore: Number(value[3]),
      alphaScore: Number(value[4]),
      verdict: String(value[5]),
      metadataURI: String(value[6]),
      creator: typeof value[7] === "string" ? value[7] : undefined
    };
  }

  const record = value as Record<string, unknown>;
  return {
    reportHash: String(record.reportHash),
    evidenceHash: String(record.evidenceHash),
    topic: String(record.topic),
    riskScore: Number(record.riskScore),
    alphaScore: Number(record.alphaScore),
    verdict: String(record.verdict),
    metadataURI: String(record.metadataURI),
    creator: typeof record.creator === "string" ? record.creator : undefined
  };
}

function verifyChainReport(report: Report, prepared: PreparedChainAttestation, receipt: BrowserTransactionReceipt, event: DecodedReportAttestedEvent, chainReport: ChainReportRecord): ChainAttestationVerification {
  const fieldMatches = {
    reportHash: chainReport.reportHash.toLowerCase() === prepared.reportHash.toLowerCase(),
    evidenceHash: chainReport.evidenceHash.toLowerCase() === prepared.evidenceHash.toLowerCase(),
    topic: chainReport.topic === report.topic,
    riskScore: chainReport.riskScore === report.riskScore,
    alphaScore: chainReport.alphaScore === report.alphaScore,
    verdict: chainReport.verdict === report.verdict,
    metadataURI: chainReport.metadataURI === prepared.metadataURI
  };
  const eventMatched =
    event.args.reportHash?.toLowerCase() === prepared.reportHash.toLowerCase() &&
    event.args.evidenceHash?.toLowerCase() === prepared.evidenceHash.toLowerCase() &&
    event.args.topic === report.topic &&
    Number(event.args.riskScore) === report.riskScore &&
    Number(event.args.alphaScore) === report.alphaScore &&
    event.args.verdict === report.verdict &&
    event.args.metadataURI === prepared.metadataURI;
  const allFieldsMatch = Object.values(fieldMatches).every(Boolean);

  return {
    status: eventMatched && allFieldsMatch ? "confirmed" : "mismatch",
    reportId: event.args.reportId.toString(),
    blockNumber: receipt.blockNumber ? hexToDecimalString(receipt.blockNumber) : "confirmed",
    eventMatched,
    checkedAt: new Date().toISOString(),
    creator: chainReport.creator,
    fieldMatches
  };
}

function hexToDecimalString(value: `0x${string}`) {
  return BigInt(value).toString();
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readPublicAttestationEnv(): AttestationEnv {
  return {
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    NEXT_PUBLIC_EXPLORER_BASE_URL: process.env.NEXT_PUBLIC_EXPLORER_BASE_URL
  };
}
