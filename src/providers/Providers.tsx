"use client";

import { ReactNode } from "react";
import { WalletProvider } from "./WalletProvider";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper
 * Combines all providers that need to be on the client side
 */
export function Providers({ children }: ProvidersProps) {
  return <WalletProvider>{children}</WalletProvider>;
}
