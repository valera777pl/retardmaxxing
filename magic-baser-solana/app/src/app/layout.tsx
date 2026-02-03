import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { GuestProvider } from "@/contexts/GuestContext";
import { CoinsProvider } from "@/contexts/CoinsContext";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Magic Baser - Vampire Survivors on Solana",
  description: "Survive the night on Solana with MagicBlock Ephemeral Rollups",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pressStart2P.variable} ${pressStart2P.className}`}>
        <WalletProvider>
          <GuestProvider>
            <CoinsProvider>
              {children}
            </CoinsProvider>
          </GuestProvider>
        </WalletProvider>
        {/* Optional CRT effect - uncomment to enable */}
        {/* <div className="crt-overlay" /> */}
      </body>
    </html>
  );
}
