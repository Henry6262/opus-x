"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface WalletContextState {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  walletName: string | null;
  availableWallets: string[];
  noWalletFound: boolean;
  connect: (walletType?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array | null>;
}

const WalletContext = createContext<WalletContextState>({
  connected: false,
  connecting: false,
  publicKey: null,
  walletName: null,
  availableWallets: [],
  noWalletFound: false,
  connect: async () => {},
  disconnect: async () => {},
  signMessage: async () => null,
});

export function useWalletContext() {
  return useContext(WalletContext);
}

interface SolanaWallet {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  isCoinbaseWallet?: boolean;
  publicKey: { toBase58: () => string } | null;
  isConnected: boolean;
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
}

interface WindowWithWallets {
  phantom?: { solana?: SolanaWallet };
  solflare?: SolanaWallet;
  backpack?: SolanaWallet;
  coinbaseSolana?: SolanaWallet;
  solana?: SolanaWallet;
}

// Wallet download links
const WALLET_LINKS: Record<string, string> = {
  phantom: "https://phantom.app/",
  solflare: "https://solflare.com/",
  backpack: "https://backpack.app/",
};

function getWindowWithWallets(): WindowWithWallets | null {
  if (typeof window === "undefined") return null;
  return window as unknown as WindowWithWallets;
}

function getAvailableWallets(): string[] {
  const win = getWindowWithWallets();
  if (!win) return [];

  const available: string[] = [];
  if (win.phantom?.solana) available.push("Phantom");
  if (win.solflare?.isSolflare) available.push("Solflare");
  if (win.backpack?.isBackpack) available.push("Backpack");
  if (win.coinbaseSolana) available.push("Coinbase");

  return available;
}

function getWalletProvider(preferredWallet?: string): SolanaWallet | null {
  const win = getWindowWithWallets();
  if (!win) return null;

  // If a specific wallet is requested, try that first
  if (preferredWallet) {
    const lower = preferredWallet.toLowerCase();
    if (lower === "phantom" && win.phantom?.solana) return win.phantom.solana;
    if (lower === "solflare" && win.solflare?.isSolflare) return win.solflare;
    if (lower === "backpack" && win.backpack?.isBackpack) return win.backpack;
    if (lower === "coinbase" && win.coinbaseSolana) return win.coinbaseSolana;
  }

  // Auto-detect: try each wallet in order
  if (win.phantom?.solana) return win.phantom.solana;
  if (win.solflare?.isSolflare) return win.solflare;
  if (win.backpack?.isBackpack) return win.backpack;
  if (win.coinbaseSolana) return win.coinbaseSolana;
  if (win.solana) return win.solana;

  return null;
}

function getWalletName(provider: SolanaWallet | null): string | null {
  if (!provider) return null;
  if (provider.isPhantom) return "Phantom";
  if (provider.isSolflare) return "Solflare";
  if (provider.isBackpack) return "Backpack";
  if (provider.isCoinbaseWallet) return "Coinbase";
  return "Solana Wallet";
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [noWalletFound, setNoWalletFound] = useState(false);

  // Check for available wallets on mount
  useEffect(() => {
    // Small delay to let wallet extensions inject
    const timer = setTimeout(() => {
      const wallets = getAvailableWallets();
      setAvailableWallets(wallets);

      // Check for existing connection
      const provider = getWalletProvider();
      if (provider?.isConnected && provider?.publicKey) {
        setConnected(true);
        setPublicKey(provider.publicKey.toBase58());
        setWalletName(getWalletName(provider));
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Listen for wallet events
  useEffect(() => {
    const provider = getWalletProvider();
    if (!provider) return;

    const handleConnect = () => {
      if (provider.publicKey) {
        setConnected(true);
        setConnecting(false);
        setPublicKey(provider.publicKey.toBase58());
        setWalletName(getWalletName(provider));
        setNoWalletFound(false);
      }
    };

    const handleDisconnect = () => {
      setConnected(false);
      setConnecting(false);
      setPublicKey(null);
      setWalletName(null);
    };

    const handleAccountChange = () => {
      if (provider.publicKey) {
        setPublicKey(provider.publicKey.toBase58());
      } else {
        handleDisconnect();
      }
    };

    provider.on("connect", handleConnect);
    provider.on("disconnect", handleDisconnect);
    provider.on("accountChanged", handleAccountChange);

    return () => {
      provider.off("connect", handleConnect);
      provider.off("disconnect", handleDisconnect);
      provider.off("accountChanged", handleAccountChange);
    };
  }, [availableWallets]);

  const connect = useCallback(async (walletType?: string) => {
    // Re-check available wallets
    const wallets = getAvailableWallets();
    setAvailableWallets(wallets);

    const provider = getWalletProvider(walletType);

    if (!provider) {
      // No wallet found - show message and open download link
      setNoWalletFound(true);
      setConnecting(false);

      // Open Phantom download page (most popular)
      const downloadUrl = walletType ? WALLET_LINKS[walletType.toLowerCase()] : WALLET_LINKS.phantom;
      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
      }
      return;
    }

    setNoWalletFound(false);
    setConnecting(true);

    try {
      // Add timeout to prevent infinite spinning
      const connectPromise = provider.connect();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), 30000);
      });

      const response = await Promise.race([connectPromise, timeoutPromise]);

      // Get publicKey from response or from provider (some wallets don't return it)
      const pubKey = response?.publicKey || provider.publicKey;

      if (!pubKey) {
        // User likely rejected the connection - just reset silently
        setConnected(false);
        setPublicKey(null);
        setWalletName(null);
        return;
      }

      setConnected(true);
      setPublicKey(pubKey.toBase58());
      setWalletName(getWalletName(provider));
    } catch (error) {
      // User rejected or timeout - reset state silently
      // Don't log error for user rejection (common case)
      const errorMessage = error instanceof Error ? error.message : "";
      if (!errorMessage.includes("rejected") && !errorMessage.includes("cancelled")) {
        console.error("Failed to connect wallet:", error);
      }
      setConnected(false);
      setPublicKey(null);
      setWalletName(null);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getWalletProvider();
    if (!provider) {
      // Just reset state if no provider
      setConnected(false);
      setPublicKey(null);
      setWalletName(null);
      return;
    }

    try {
      await provider.disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    } finally {
      setConnected(false);
      setPublicKey(null);
      setWalletName(null);
    }
  }, []);

  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array | null> => {
    const provider = getWalletProvider();
    if (!provider || !connected) return null;

    try {
      const response = await provider.signMessage(message, "utf8");
      return response.signature;
    } catch (error) {
      console.error("Failed to sign message:", error);
      return null;
    }
  }, [connected]);

  return (
    <WalletContext.Provider
      value={{
        connected,
        connecting,
        publicKey,
        walletName,
        availableWallets,
        noWalletFound,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
