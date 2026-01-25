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
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array | null>;
}

const WalletContext = createContext<WalletContextState>({
  connected: false,
  connecting: false,
  publicKey: null,
  walletName: null,
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
  publicKey: { toBase58: () => string } | null;
  isConnected: boolean;
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
}

function getWalletProvider(): SolanaWallet | null {
  if (typeof window === "undefined") return null;

  const windowWithSolana = window as unknown as {
    phantom?: { solana?: SolanaWallet };
    solflare?: SolanaWallet;
    backpack?: SolanaWallet;
    solana?: SolanaWallet;
  };

  // Try Phantom first
  if (windowWithSolana.phantom?.solana) {
    return windowWithSolana.phantom.solana;
  }

  // Try Solflare
  if (windowWithSolana.solflare?.isSolflare) {
    return windowWithSolana.solflare;
  }

  // Try Backpack
  if (windowWithSolana.backpack?.isBackpack) {
    return windowWithSolana.backpack;
  }

  // Try generic solana provider
  if (windowWithSolana.solana) {
    return windowWithSolana.solana;
  }

  return null;
}

function getWalletName(provider: SolanaWallet | null): string | null {
  if (!provider) return null;
  if (provider.isPhantom) return "Phantom";
  if (provider.isSolflare) return "Solflare";
  if (provider.isBackpack) return "Backpack";
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

  // Check for existing connection on mount
  useEffect(() => {
    const provider = getWalletProvider();
    if (provider?.isConnected && provider?.publicKey) {
      setConnected(true);
      setPublicKey(provider.publicKey.toBase58());
      setWalletName(getWalletName(provider));
    }
  }, []);

  // Listen for wallet events
  useEffect(() => {
    const provider = getWalletProvider();
    if (!provider) return;

    const handleConnect = () => {
      if (provider.publicKey) {
        setConnected(true);
        setPublicKey(provider.publicKey.toBase58());
        setWalletName(getWalletName(provider));
      }
    };

    const handleDisconnect = () => {
      setConnected(false);
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
  }, []);

  const connect = useCallback(async () => {
    const provider = getWalletProvider();

    if (!provider) {
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      setConnecting(true);
      const response = await provider.connect();
      setConnected(true);
      setPublicKey(response.publicKey.toBase58());
      setWalletName(getWalletName(provider));
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getWalletProvider();
    if (!provider) return;

    try {
      await provider.disconnect();
      setConnected(false);
      setPublicKey(null);
      setWalletName(null);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
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
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
