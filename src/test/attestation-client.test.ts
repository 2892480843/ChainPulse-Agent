import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, encodeFunctionResult } from "viem";
import {
  attestReportOnChain,
  createDeterministicHash,
  createEvidenceHash,
  createReportHash,
  createReportMetadataURI,
  getAttestationReadiness,
  mockAttestationClient,
  prepareChainAttestation,
  readAttestationConfig,
  selectAttestationClient,
  signalAttestationAbi,
  verifyProofBundle
} from "@/lib/adapters/attestation-client";
import { attestation, reports } from "@/lib/mock-data";

const originalEnv = {
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  NEXT_PUBLIC_EXPLORER_BASE_URL: process.env.NEXT_PUBLIC_EXPLORER_BASE_URL
};

afterEach(() => {
  process.env.NEXT_PUBLIC_CHAIN_ID = originalEnv.NEXT_PUBLIC_CHAIN_ID;
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = originalEnv.NEXT_PUBLIC_CONTRACT_ADDRESS;
  process.env.NEXT_PUBLIC_EXPLORER_BASE_URL = originalEnv.NEXT_PUBLIC_EXPLORER_BASE_URL;
  delete (window as Window & { ethereum?: unknown }).ethereum;
});

describe("attestation adapter and proof hashing", () => {
  it("creates deterministic hashes regardless of object key order", async () => {
    const first = await createDeterministicHash({ b: 2, a: { d: 4, c: 3 } });
    const second = await createDeterministicHash({ a: { c: 3, d: 4 }, b: 2 });

    expect(first).toBe(second);
    expect(first).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("recomputes the stored report and evidence hashes", async () => {
    await expect(createReportHash(reports[0])).resolves.toBe(reports[0].reportHash);
    await expect(createEvidenceHash(reports[0].evidence)).resolves.toBe(reports[0].evidenceHash);

    const verification = await verifyProofBundle(reports[0], reports[0].evidence, attestation);

    expect(verification.reportHashMatch).toBe(true);
    expect(verification.evidenceHashMatch).toBe(true);
  });

  it("keeps mock fallback separate from live-ready chain configuration", () => {
    const unconfigured = readAttestationConfig({
      NEXT_PUBLIC_CHAIN_ID: "11155111",
      NEXT_PUBLIC_CONTRACT_ADDRESS: "",
      NEXT_PUBLIC_EXPLORER_BASE_URL: ""
    });
    const liveReady = readAttestationConfig({
      NEXT_PUBLIC_CHAIN_ID: "11155111",
      NEXT_PUBLIC_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000001",
      NEXT_PUBLIC_EXPLORER_BASE_URL: "https://sepolia.etherscan.io"
    });

    expect(getAttestationReadiness(unconfigured).state).toBe("not configured");
    expect(selectAttestationClient(unconfigured).mode).toBe("mock fallback");
    expect(getAttestationReadiness(liveReady).state).toBe("live ready");
    expect(selectAttestationClient(liveReady).mode).toBe("live ready");
  });

  it("keeps the mock client usable for unconfigured demos", async () => {
    await expect(mockAttestationClient.getAttestation(reports[0].id)).resolves.toMatchObject({
      reportHash: reports[0].reportHash,
      evidenceHash: reports[0].evidenceHash
    });
  });

  it("encodes the full SignalAttestation calldata for Sepolia writes", async () => {
    const prepared = await prepareChainAttestation(reports[0], reports[0].evidence, {
      chainId: 11155111,
      contractAddress: "0x0000000000000000000000000000000000000001",
      explorerBaseUrl: "https://sepolia.etherscan.io",
      contractConfigured: true,
      explorerConfigured: true,
      walletMode: "browser wallet missing"
    });
    const decoded = decodeFunctionData({
      abi: signalAttestationAbi,
      data: prepared.data
    });

    expect(decoded.functionName).toBe("attest");
    expect(decoded.args).toEqual([
      reports[0].reportHash,
      reports[0].evidenceHash,
      reports[0].topic,
      reports[0].riskScore,
      reports[0].alphaScore,
      reports[0].verdict,
      createReportMetadataURI(reports[0])
    ]);
    expect(prepared.functionSignature).toBe("attest(bytes32,bytes32,string,uint8,uint8,string,string)");
    expect(prepared.explorerAddressUrl).toBe("https://sepolia.etherscan.io/address/0x0000000000000000000000000000000000000001");
  });

  it("waits for receipt, decodes the event, and verifies on-chain storage after a browser wallet write", async () => {
    const contractAddress = "0x0000000000000000000000000000000000000001" as const;
    const walletAddress = "0x0000000000000000000000000000000000000002" as const;
    const txHash = "0x1111111111111111111111111111111111111111111111111111111111111111" as const;
    const reportId = BigInt(7);
    const createdAt = BigInt(1_780_000_000);
    const metadataURI = createReportMetadataURI(reports[0]);
    process.env.NEXT_PUBLIC_CHAIN_ID = "11155111";
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = contractAddress;
    process.env.NEXT_PUBLIC_EXPLORER_BASE_URL = "https://sepolia.etherscan.io";

    const topics = encodeEventTopics({
      abi: signalAttestationAbi,
      eventName: "ReportAttested",
      args: {
        reportId,
        creator: walletAddress
      }
    });
    const data = encodeAbiParameters(
      [
        { name: "topic", type: "string" },
        { name: "riskScore", type: "uint8" },
        { name: "alphaScore", type: "uint8" },
        { name: "verdict", type: "string" },
        { name: "reportHash", type: "bytes32" },
        { name: "evidenceHash", type: "bytes32" },
        { name: "metadataURI", type: "string" },
        { name: "createdAt", type: "uint256" }
      ],
      [reports[0].topic, reports[0].riskScore, reports[0].alphaScore, reports[0].verdict, reports[0].reportHash as `0x${string}`, reports[0].evidenceHash as `0x${string}`, metadataURI, createdAt]
    );
    const chainReport = {
      reportHash: reports[0].reportHash as `0x${string}`,
      evidenceHash: reports[0].evidenceHash as `0x${string}`,
      topic: reports[0].topic,
      riskScore: reports[0].riskScore,
      alphaScore: reports[0].alphaScore,
      verdict: reports[0].verdict,
      metadataURI,
      creator: walletAddress,
      createdAt
    };
    const readback = encodeFunctionResult({
      abi: signalAttestationAbi,
      functionName: "getReport",
      result: chainReport
    });
    const request = vi.fn(async ({ method }: { method: string; params?: unknown[] }) => {
      if (method === "eth_chainId") return "0xaa36a7";
      if (method === "eth_sendTransaction") return txHash;
      if (method === "eth_getTransactionReceipt") {
        return {
          transactionHash: txHash,
          status: "0x1",
          blockNumber: "0x2a",
          logs: [
            {
              address: contractAddress,
              topics,
              data
            }
          ]
        };
      }
      if (method === "eth_call") return readback;
      throw new Error(`unexpected ethereum method: ${method}`);
    });
    (window as Window & { ethereum?: { request: typeof request } }).ethereum = { request };

    const record = await attestReportOnChain(reports[0], walletAddress);

    expect(record.txHash).toBe(txHash);
    expect(record.block).toBe("42");
    expect(record.reportId).toBe("7");
    expect(record.onChainVerification).toMatchObject({
      status: "confirmed",
      reportId: "7",
      blockNumber: "42",
      eventMatched: true,
      fieldMatches: {
        reportHash: true,
        evidenceHash: true,
        topic: true,
        riskScore: true,
        alphaScore: true,
        verdict: true,
        metadataURI: true
      }
    });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: "eth_getTransactionReceipt" }));
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: "eth_call" }));
  });
});
