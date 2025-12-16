"use client";

import { motion } from "framer-motion";

/* ---------- Minimal UI primitives ---------- */

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl bg-white shadow-xl ${className}`}>
      {children}
    </div>
  );
}

function CardContent({ children, className = "" }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-white/20 text-white hover:bg-white/10",
  };

  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- Data ---------- */

const invites = [
  {
    app: "Base",
    description: "Early access invite to Base ecosystem",
    price: "$10",
    seller: "alice.eth",
    address: "0x1234…5678",
    ethos: 85,
    color: "bg-blue-100",
  },
  {
    app: "Ethos",
    description: "Invite to the Ethos app",
    price: "$8",
    seller: "bob.eth",
    address: "0xabcd…efgh",
    ethos: 91,
    color: "bg-purple-100",
  },
];

/* ---------- Page ---------- */

export default function Home() {
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
          <Button
            variant="outline"
            className="rounded-full px-8 py-6 text-lg"
          >
            Become a Seller
          </Button>
        </div>
      </section>

      {/* Trending */}
      <section className="px-10 pb-32">
        <h2 className="text-3xl font-semibold mb-12">Trending Invites</h2>

        <div className="flex gap-10 overflow-x-auto">
          {invites.map((invite, i) => (
            <motion.div
              key={invite.app}
              whileHover={{ rotate: i % 2 === 0 ? -3 : 3, y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="shrink-0"
            >
              <Card className="w-[300px] rounded-[28px] bg-white/90 backdrop-blur shadow-2xl border border-black/5">
                <CardContent className="p-5 flex flex-col gap-4">
                  {/* Top visual */}
                  <div
                    className={`relative rounded-2xl p-5 ${invite.color}`}
                  >
                    <span className="absolute top-3 right-3 text-xs font-semibold bg-white px-2 py-1 rounded-full shadow">
                      {invite.price}
                    </span>
                    <h3 className="text-3xl font-bold tracking-tight">
                      {invite.app}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600">
                    {invite.description}
                  </p>

                  {/* Seller */}
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

                  {/* CTA */}
                  <Button className="mt-2 w-full rounded-xl py-3">
                    Buy Invite
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
