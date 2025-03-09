import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { WalletProvider } from "@/components/wallet-provider";
import { ConnectWallet } from "@/components/connect-wallet";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Command Flare | Centurion Agent",
  description:
    "Centurion is a platform for graph-RAG based agentic DeFAI interactions running in a TEE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WalletProvider>
            <div className="flex flex-col h-screen">
              <header className="flex items-center justify-between p-4 border-b border-pink-800">
                {/* <h1 className="text-2xl font-bold">Centurion</h1> */}
                <Image src="/logo.png" alt="Centurion" width={96} height={96} />
                <div className="flex items-center gap-4">
                  <ConnectWallet />
                  <ThemeToggle />
                </div>
              </header>
              <main className="p-4">{children}</main>
              <Toaster richColors />
            </div>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
