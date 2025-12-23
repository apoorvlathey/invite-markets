import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import Image from "next/image";
import Link from "next/link";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-zinc-100 min-h-screen overflow-x-hidden`}
      >
        {/* Animated gradient orbs background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Primary cyan orb - top left */}
          <div
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, rgba(6, 182, 212, 0.8) 0%, rgba(6, 182, 212, 0) 70%)",
              filter: "blur(60px)",
              animation: "float 20s ease-in-out infinite",
            }}
          />
          {/* Purple orb - top right */}
          <div
            className="absolute -top-20 -right-32 w-[700px] h-[700px] rounded-full opacity-35"
            style={{
              background:
                "radial-gradient(circle, rgba(168, 85, 247, 0.8) 0%, rgba(168, 85, 247, 0) 70%)",
              filter: "blur(60px)",
              animation: "float-slow 25s ease-in-out infinite 2s",
            }}
          />
          {/* Blue orb - center */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-25"
            style={{
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0) 70%)",
              filter: "blur(80px)",
              animation: "pulse 8s ease-in-out infinite",
            }}
          />
          {/* Cyan orb - bottom left */}
          <div
            className="absolute -bottom-32 -left-20 w-[550px] h-[550px] rounded-full opacity-35"
            style={{
              background:
                "radial-gradient(circle, rgba(34, 211, 238, 0.7) 0%, rgba(34, 211, 238, 0) 70%)",
              filter: "blur(50px)",
              animation: "float 22s ease-in-out infinite 1s",
            }}
          />
          {/* Purple/magenta orb - bottom right */}
          <div
            className="absolute -bottom-48 -right-32 w-[650px] h-[650px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(192, 132, 252, 0.7) 0%, rgba(139, 92, 246, 0) 70%)",
              filter: "blur(70px)",
              animation: "float-slow 28s ease-in-out infinite 3s",
            }}
          />
          {/* Extra accent orb - mid-right */}
          <div
            className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(6, 182, 212, 0.6) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 70%)",
              filter: "blur(50px)",
              animation: "float 18s ease-in-out infinite 4s",
            }}
          />

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-100"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "100px 100px",
              maskImage:
                "radial-gradient(ellipse 80% 50% at 50% 0%, black 70%, transparent)",
            }}
          />

          {/* Noise texture overlay for depth */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat",
            }}
          />
        </div>

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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-linear-to-r from-cyan-500/10 via-transparent to-purple-500/10" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="group flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg group-hover:shadow-cyan-500/50 transition-all">
              <Image
                src="/icon.png"
                alt="Invite.markets"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:from-cyan-400 group-hover:to-blue-400 transition-all">
              Invite.markets
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors duration-150 rounded-lg hover:bg-white/5"
            >
              Explore
            </Link>
            <Link
              href="/seller"
              className="group relative px-6 py-3 text-sm font-bold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
            >
              {/* Animated gradient background */}
              <div
                className="absolute inset-0 bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600 animate-gradient"
                style={{ backgroundSize: "200% 200%" }}
              />

              {/* Shimmer effect */}
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Border glow */}
              <div className="absolute inset-0 rounded-xl border border-white/20" />

              {/* Content */}
              <span className="relative z-10 text-white flex items-center gap-2 drop-shadow-lg">
                <svg
                  className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Sell Invite
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>

              {/* Outer glow */}
              <div
                className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600"
                style={{ zIndex: -1 }}
              />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
