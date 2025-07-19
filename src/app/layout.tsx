import "./globals.css";

import type { Metadata } from "next";
import { Inconsolata, Noto_Sans_JP } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/client";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const inconsolata = Inconsolata({
  variable: "--font-inconsolata",
  subsets: ["latin"],
});

// TODO: update metadata
export const metadata: Metadata = {
  title: "Voicenotes",
  description: "Transcribe your voice notes to text with ease.",
};

// TODO: update html lang attribute if needed
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${inconsolata.variable} antialiased`}
      >
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
