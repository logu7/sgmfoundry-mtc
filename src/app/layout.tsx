import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/styles/certificate-print.css";

const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    { path: "../../public/fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const sourceSerif = localFont({
  variable: "--font-source-serif",
  display: "swap",
  src: [
    { path: "../../public/fonts/source-serif-4-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/source-serif-4-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/source-serif-4-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const plexMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  src: [
    { path: "../../public/fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/ibm-plex-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "SGM Foundry — Material Test Certificates",
  description: "Material Test Certificate generator for Sri Gnanamurugan Foundry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-100">{children}</body>
    </html>
  );
}
