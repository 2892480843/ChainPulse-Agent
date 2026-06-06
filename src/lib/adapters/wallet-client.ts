"use client";

export type WalletConnection =
  | { status: "checking"; address?: undefined; chainId?: undefined; error?: string }
  | { status: "missing"; address?: undefined; chainId?: undefined; error?: string }
  | { status: "disconnected"; address?: undefined; chainId?: number; error?: string }
  | { status: "connected"; address: string; chainId?: number; error?: string };

export interface BrowserEthereum {
  chainId?: string;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  selectedAddress?: string | null;
  on?(event: "accountsChanged" | "chainChanged", handler: (payload: unknown) => void): void;
  removeListener?(event: "accountsChanged" | "chainChanged", handler: (payload: unknown) => void): void;
}

export function getBrowserWallet(): BrowserEthereum | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { ethereum?: BrowserEthereum }).ethereum ?? null;
}

export function readCachedWalletConnection(): WalletConnection {
  const ethereum = getBrowserWallet();
  if (!ethereum) return { status: "missing", error: "Browser wallet is not available" };

  const address = typeof ethereum.selectedAddress === "string" && ethereum.selectedAddress ? ethereum.selectedAddress : undefined;
  const chainId = typeof ethereum.chainId === "string" ? parseHexChainId(ethereum.chainId) : undefined;
  return address ? { status: "connected", address, chainId } : { status: "checking" };
}

export async function readWalletConnection(requestAccounts: boolean): Promise<WalletConnection> {
  const ethereum = getBrowserWallet();
  if (!ethereum) return { status: "missing", error: "Browser wallet is not available" };

  const chainId = await readWalletChainId(ethereum);
  try {
    const accounts = (await ethereum.request({ method: requestAccounts ? "eth_requestAccounts" : "eth_accounts" })) as unknown;
    const address = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : undefined;
    return address ? { status: "connected", address, chainId } : { status: "disconnected", chainId };
  } catch (error) {
    return {
      status: "disconnected",
      chainId,
      error: error instanceof Error ? error.message : "Wallet connection failed"
    };
  }
}

export async function readWalletChainId(ethereum: BrowserEthereum) {
  try {
    const chainId = (await ethereum.request({ method: "eth_chainId" })) as unknown;
    return typeof chainId === "string" ? parseHexChainId(chainId) : undefined;
  } catch {
    return undefined;
  }
}

export function parseHexChainId(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
