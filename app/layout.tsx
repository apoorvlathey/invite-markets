import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import Image from "next/image";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "invite.markets | Buy & Sell Early Access to the Hottest Web3 Apps",
  description:
    "Buy and sell early access to the hottest web3 apps — instantly. Powered by x402.",
  keywords: [
    "invite.markets",
    "buy invite",
    "sell invite",
    "web3 apps",
    "early access",
  ],
  authors: [{ name: "Apoorv Lathey", url: "https://github.com/apoorvlathey" }],
  creator: "Apoorv Lathey",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://invite.markets",
    title: "invite.markets | Buy & Sell Early Access to the Hottest Web3 Apps",
    description:
      "Buy and sell early access to the hottest web3 apps — instantly. Powered by x402.",
    siteName: "invite.markets",
  },
  twitter: {
    card: "summary_large_image",
    title: "invite.markets | Buy & Sell Early Access to the Hottest Web3 Apps",
    description:
      "Buy and sell early access to the hottest web3 apps — instantly. Powered by x402.",
    creator: "@apoorveth",
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
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
      },
    ],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-zinc-100`}
      >
        <NextTopLoader
          color="#06b6d4"
          height={3}
          showSpinner={false}
          speed={200}
          shadow="0 0 10px #06b6d4,0 0 5px #06b6d4"
        />
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}

function Navigation() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10">
      {/* Navbar background with gradient */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
      
      <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <a 
            href="/" 
            className="group flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg group-hover:shadow-cyan-500/50 transition-all">
              <Image
                src="/icon.png"
                alt="Invite.markets"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:from-cyan-400 group-hover:to-blue-400 transition-all">
              Invite.markets
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors duration-150 rounded-lg hover:bg-white/5"
            >
              Explore
            </a>
            <a
              href="/seller"
              className="group relative px-6 py-3 text-sm font-bold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-gradient" style={{ backgroundSize: '200% 200%' }} />
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Border glow */}
              <div className="absolute inset-0 rounded-xl border border-white/20" />
              
              {/* Content */}
              <span className="relative z-10 text-white flex items-center gap-2 drop-shadow-lg">
                <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Sell Invite
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              
              {/* Outer glow */}
              <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600" style={{ zIndex: -1 }} />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
