"use client";

import { ReactNode } from "react";
import {
  RainbowKitProvider,
  getDefaultWallets,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { createConfig, fallback } from "wagmi";
import { FLARE_NETWORK } from "@/lib/config";
import "@rainbow-me/rainbowkit/styles.css";

// Configure chains and providers
const { wallets } = getDefaultWallets({
  appName: "Centurion",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Replace with your WalletConnect project ID
});

// Create connectors
const connectors = connectorsForWallets([...wallets]);

// Create wagmi config
const config = createConfig({
  chains: [FLARE_NETWORK],
  transports: {
    [FLARE_NETWORK.id]: fallback([http(FLARE_NETWORK.rpcUrls.default.http[0])]),
  },
  connectors,
});

// Create a client
const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
