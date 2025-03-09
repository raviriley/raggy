"use client";

import { ReactNode } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { flare } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const flareChain = flare;

// Create wagmi config with RainbowKit
const config = getDefaultConfig({
  appName: "Centurion",
  projectId: "cf0205bcfbf306b557dbb33cb630db3f",
  chains: [flareChain],
  transports: {
    [flareChain.id]: http(flareChain.rpcUrls.default.http[0]),
  },
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
