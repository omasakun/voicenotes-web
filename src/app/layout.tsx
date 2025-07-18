import type { Metadata } from "next";
import { Inconsolata, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
});

const inconsolata = Inconsolata({
  variable: "--font-inconsolata",
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
        {children}
      </body>
    </html>
  );
}
