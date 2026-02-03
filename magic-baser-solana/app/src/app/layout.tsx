import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { GuestProvider } from "@/contexts/GuestContext";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body className={`${geistMono.variable} antialiased bg-gray-950`}>
        <WalletProvider>
          <GuestProvider>{children}</GuestProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
