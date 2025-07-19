import "./globals.css";

import type { Metadata } from "next";
import { Inconsolata, Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
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
      <body className={cn(notoSansJP.variable, inconsolata.variable, "bg-gradient-to-br from-blue-50 to-indigo-100")}>
        <TRPCReactProvider>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
