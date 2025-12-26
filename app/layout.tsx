import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { Providers } from "@/app/providers";
import { Navbar } from "@/app/components/Navbar";
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
  metadataBase: new URL("https://invite.markets"),
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
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
