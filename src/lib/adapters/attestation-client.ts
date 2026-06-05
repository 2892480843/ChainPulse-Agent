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

export const mockAttestationClient: AttestationClient = {
  async createReportHash(report) {
    return report.reportHash;
  },

  async createEvidenceHash(evidence) {
    const matchedReport = reports.find((report) => report.evidence.some((item) => evidence.some((candidate) => candidate.id === item.id)));
    return matchedReport?.evidenceHash ?? attestation.evidenceHash;
  },

  async attestReport(_reportId, walletAddress) {
    return {
      ...attestation,
      walletAddress
    };
  },

  async getAttestation(_reportId) {
    return attestation;
  }
};

// Future integration point:
// Swap this mock client for wagmi / viem calls and contract writes once the
// attestation contract address and wallet connection flow are introduced.
