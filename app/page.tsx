"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

/* ---------- Minimal UI primitives ---------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-white shadow-xl ${className}`}>
      {children}
    </div>
  );
}

function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all";
  const variants: Record<"primary" | "outline", string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-white/20 text-white hover:bg-white/10",
  };

  return (
    <button {...props} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

/* ---------- Types ---------- */

interface Listing {
  slug: string;
  inviteUrl: string;
  priceUsdc: number;
  sellerAddress: string;
  status: "active" | "sold" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface Invite {
  app: string;
  description: string;
  price: string;
  seller: string;
  address: string;
  ethos: number;
  color: string;
  slug: string;
}

/* ---------- Helper to transform API -> UI ---------- */

function transformListing(listing: Listing): Invite {
  let host = "App";
  try {
    host = new URL(listing.inviteUrl).hostname.split(".")[0] || "App";
  } catch {
    // keep default
  }

  const colors = [
    "bg-blue-100",
    "bg-purple-100",
    "bg-green-100",
    "bg-pink-100",
    "bg-yellow-100",
  ];
  const color = colors[Math.abs(listing.slug.charCodeAt(0)) % colors.length];
  const shortAddr = `${listing.sellerAddress.slice(
    0,
    6
  )}…${listing.sellerAddress.slice(-4)}`;

  return {
    app: host.charAt(0).toUpperCase() + host.slice(1),
    description: `Early access invite to ${host}`,
    price: `$${listing.priceUsdc}`,
    seller: `${listing.sellerAddress.slice(0, 8)}.eth`,
    address: shortAddr,
    ethos: Math.floor(Math.random() * 20) + 80, // placeholder
    color,
    slug: listing.slug,
  };
}

/* ---------- Page ---------- */

export default function Home() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/listings");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch listings");
        }

        const listings: Listing[] = data.listings || [];
        const active = listings.filter((l) => l.status === "active");
        setInvites(active.map(transformListing));
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load listings"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center py-32 px-6">
        <h1 className="text-6xl font-bold mb-6">Invite.markets</h1>
        <p className="text-xl text-gray-400 max-w-2xl mb-10">
          x402-powered invite markets. Buy and sell early access to the hottest
          web3 apps — instantly.
        </p>
        <div className="flex gap-4">
          <Button className="rounded-full px-8 py-6 text-lg">
            Explore Invites
          </Button>
          <Button variant="outline" className="rounded-full px-8 py-6 text-lg">
            Become a Seller
          </Button>
        </div>
      </section>

      {/* Trending */}
      <section className="px-10 pb-32">
        <h2 className="text-3xl font-semibold mb-12">Trending Invites</h2>

        {loading && (
          <div className="text-center text-gray-400 py-20">
            Loading invites...
          </div>
        )}

        {error && <div className="text-center text-red-400 py-20">{error}</div>}

        {!loading && !error && invites.length === 0 && (
          <div className="text-center text-gray-400 py-20">
            No invites available at the moment.
          </div>
        )}

        {!loading && !error && invites.length > 0 && (
          <div className="flex gap-10 overflow-x-auto">
            {invites.map((invite, i) => (
              <motion.div
                key={invite.slug}
                whileHover={{ rotate: i % 2 === 0 ? -3 : 3, y: -10 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="shrink-0"
              >
                <Card className="w-[300px] rounded-[28px] bg-white/90 backdrop-blur shadow-2xl border border-black/5">
                  <CardContent className="p-5 flex flex-col gap-4">
                    <div className={`relative rounded-2xl p-5 ${invite.color}`}>
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-3xl font-bold tracking-tight">
                          {invite.app}
                        </h3>
                        <span className="text-lg font-semibold">
                          {invite.price} USDC
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600">
                      {invite.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{invite.seller}</p>
                        <p className="text-xs text-gray-500">
                          {invite.address}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="font-semibold text-green-600">
                          {invite.ethos}
                        </span>
                      </div>
                    </div>

                    <Link href={`/listing/${invite.slug}`} className="w-full">
                      <Button className="mt-2 w-full rounded-xl py-3">
                        Buy Invite
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
