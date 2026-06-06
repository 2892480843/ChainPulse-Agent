import { describe, expect, it } from "vitest";
import {
  createDeterministicHash,
  createEvidenceHash,
  createReportHash,
  getAttestationReadiness,
  mockAttestationClient,
  readAttestationConfig,
  selectAttestationClient,
  verifyProofBundle
} from "@/lib/adapters/attestation-client";
import { attestation, reports } from "@/lib/mock-data";

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
});
