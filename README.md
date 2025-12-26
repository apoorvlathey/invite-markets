# invite.markets

A marketplace for buying and selling exclusive invite links to the hottest web3 apps — instantly, using USDC payments on Base.

![Powered by x402](https://img.shields.io/badge/Powered%20by-x402-00D4FF?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)
![Base](https://img.shields.io/badge/Network-Base-0052FF?style=flat-square)

## Overview

invite.markets connects sellers who have exclusive app invites with buyers who want early access. Sellers list their invite links at their desired price in USDC, and buyers can instantly purchase them through the x402 payment protocol — no escrow, no waiting.

### Features

- 🎟️ **Invite Marketplace** — Browse and purchase invite links for web3 apps
- 💰 **Instant USDC Payments** — Powered by x402 protocol on Base
- 🔐 **Signature-Verified Listings** — EIP-712 signed listings ensure authenticity
- ⭐ **Seller Reputation** — Ethos Network integration for trust scores
- 🏷️ **Featured Apps** — Highlighted apps with custom icons
- 👛 **Multi-Wallet Support** — Connect via MetaMask, Coinbase Wallet, WalletConnect, and more
- 🎨 **Modern UI** — Beautiful animations with Framer Motion

## How It Works

### For Sellers

1. Connect your wallet at `/seller`
2. Select an app (featured or custom) and enter your invite URL
3. Set your price in USDC
4. Sign the listing with your wallet (no gas required)
5. Your invite is live! Get paid instantly when someone buys

### For Buyers

1. Browse trending invites on the homepage
2. Check seller reputation via Ethos score
3. Click to view listing details
4. Connect wallet and pay with USDC
5. Instantly receive the invite URL

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- A wallet on Base or Base Sepolia
- MongoDB database
- WalletConnect Project ID ([get one free](https://cloud.walletconnect.com))

### Installation

1. Clone the repository:

```bash
git clone https://github.com/apoorvlathey/invite-markets.git
cd invite-markets
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables:

```bash
cp example.env.local .env.local
```

Edit `.env.local` with your configuration.

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
invite-markets/
├── app/
│   ├── api/
│   │   ├── listings/          # Listing CRUD endpoints
│   │   │   ├── route.ts       # GET all, POST create
│   │   │   └── [slug]/
│   │   │       └── route.ts   # GET single listing
│   │   └── purchase/
│   │       └── [slug]/
│   │           └── route.ts   # x402-protected purchase endpoint
│   ├── components/
│   │   └── PaymentSuccessModal.tsx
│   ├── listing/
│   │   └── [slug]/
│   │       └── page.tsx       # Individual listing page
│   ├── seller/
│   │   └── page.tsx           # Seller listing creation
│   ├── page.tsx               # Homepage / marketplace
│   ├── layout.tsx             # Root layout with providers
│   └── providers.tsx          # Wagmi & RainbowKit setup
├── data/
│   └── featuredApps.ts        # Featured app configurations
├── lib/
│   ├── listing.ts             # Listing utilities
│   ├── mongoose.ts            # MongoDB connection
│   ├── signature.ts           # EIP-712 signature verification
│   └── wagmi.ts               # Wagmi configuration
├── models/
│   └── listing.ts             # Mongoose schema
└── public/
    └── images/
        └── appIcons/          # Featured app icons
```

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) with App Router
- **Payments:** [x402 Protocol](https://github.com/coinbase/x402) for USDC payments
- **Database:** MongoDB with Mongoose
- **Wallet Connection:** [RainbowKit](https://www.rainbowkit.com/) + [Wagmi](https://wagmi.sh/)
- **Blockchain:** [Base](https://base.org/) (L2)
- **Reputation:** [Ethos Network](https://ethos.network/) for trust scores
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Styling:** Tailwind CSS

## Networks

| Network      | Use Case            | USDC         |
| ------------ | ------------------- | ------------ |
| Base Sepolia | Development/Testing | Testnet USDC |
| Base Mainnet | Production          | Real USDC    |

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy!

The app is fully compatible with Vercel's Edge Runtime and serverless functions.

## Security

- All listings are signed with EIP-712 typed data
- Seller addresses are verified against signatures server-side
- MongoDB injection protection via Mongoose
- Input validation on both client and server
- Invite URLs are only revealed after successful payment

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

---

Built with ❤️ on Base
