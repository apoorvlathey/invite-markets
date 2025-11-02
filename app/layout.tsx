import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "x402 Random Number API | Payment-Gated API with PayAI",
  description:
    "Generate random numbers within a range for 0.01 USDC per request on Base.",
  keywords: [
    "x402",
    "payment API",
    "crypto payments",
    "USDC",
    "Base",
    "PayAI",
    "random number",
    "API monetization",
  ],
  authors: [{ name: "Apoorv Lathey", url: "https://github.com/apoorvlathey" }],
  creator: "Apoorv Lathey",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://x402-random-number.vercel.app",
    title: "x402 Random Number API",
    description:
      "Generate random numbers within a range for 0.01 USDC per request on Base network.",
    siteName: "x402 Random Number API",
  },
  twitter: {
    card: "summary_large_image",
    title: "x402 Random Number API",
    description:
      "Generate random numbers within a range for 0.01 USDC per request on Base network.",
    creator: "@apoorvlathey",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
