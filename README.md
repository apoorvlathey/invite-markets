# invite.markets

A marketplace for buying and selling exclusive invite links to the hottest web3 apps — instantly, using USDC payments on Base.

![Powered by x402](https://img.shields.io/badge/Powered%20by-x402-00D4FF?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)
![Base](https://img.shields.io/badge/Network-Base-0052FF?style=flat-square)

## Features

- 🎟️ **Invite Marketplace** — Browse and purchase invite links for web3 apps
- 💰 **Instant USDC Payments** — Powered by x402 protocol on Base
- 🔐 **Signature-Verified Listings** — EIP-712 signed listings ensure authenticity
- ⭐ **Seller Reputation** — Ethos Network integration for trust scores
- 🏷️ **Featured Apps** — Highlighted apps with custom branding
- 👛 **Multi-Wallet Support** — Via Thirdweb (MetaMask, Coinbase Wallet, WalletConnect, etc.)
- 🎨 **Modern UI** — Beautiful dark theme with Framer Motion animations
- 🔒 **Whitelist Mode** — Optional gated access with waitlist

## How It Works

### For Buyers

1. Browse trending invites on the homepage or `/apps`
2. Check seller reputation via Ethos score
3. Click to view listing details
4. Connect wallet and pay with USDC
5. Instantly receive the invite URL

### For Sellers

1. Connect your wallet at `/sell`
2. Select an app (featured or custom) and enter your invite URL
3. Set your price in USDC
4. Sign the listing with your wallet (no gas required)
5. Get paid instantly when someone buys

## Pages

| Route                | Description                            |
| -------------------- | -------------------------------------- |
| `/`                  | Homepage with trending invites         |
| `/apps`              | Browse all apps with available invites |
| `/app/[slug]`        | App-specific listing page              |
| `/listing/[slug]`    | Individual listing detail & purchase   |
| `/sell`              | Create a new listing                   |
| `/profile/[address]` | Seller profile with listings & sales   |
| `/admin`             | Waitlist dashboard (SIWE protected)    |
| `/invite/[code]`     | Exclusive access verification          |

## Whitelist & Waitlist System

When `NEXT_PUBLIC_IS_ONLY_WHITELIST=true`, the site operates in gated access mode:

- **Waitlist Form** — Users without access see a waitlist signup form
- **Cloudflare Turnstile** — Captcha protection against spam
- **Invite Links** — Users with valid `/invite/<code>` URLs get permanent access via cookie
- **Admin Dashboard** — View waitlist entries at `/admin` (requires SIWE signature from admin address)

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- MongoDB database
- Thirdweb account ([dashboard](https://thirdweb.com/dashboard))
- Cloudflare Turnstile keys (for whitelist mode)

### Installation

```bash
git clone https://github.com/apoorvlathey/invite-markets.git
cd invite-markets
pnpm install
cp example.env.local .env.local
# Edit .env.local with your configuration
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
# Network
NEXT_PUBLIC_IS_TESTNET=              # "true" for Base Sepolia, empty for mainnet

# Whitelist Mode
NEXT_PUBLIC_IS_ONLY_WHITELIST=       # "true" to enable gated access
INVITE_ACCESS_CODE=                  # Secret code for /invite/<code> URLs
ADMIN_ETH_ADDRESSES=                 # Comma-separated admin wallet addresses

# Cloudflare Turnstile (captcha)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=      # Site key (use test key for localhost)
TURNSTILE_SECRET_KEY=                # Secret key

# Database
MONGODB_URL=                         # MongoDB connection string

# Thirdweb
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=      # Client ID from dashboard
SECRET_KEY=                          # Secret key for server wallet
SERVER_WALLET=                       # Server wallet address for x402

# Name Resolution
NEYNAR_API_KEY=                      # Farcaster username resolution
NEXT_PUBLIC_MAINNET_RPC_URL=         # ENS resolution
NEXT_PUBLIC_BASE_RPC_URL=            # Basename resolution
```

**Turnstile Test Keys (localhost):**

- Site Key: `1x00000000000000000000AA`
- Secret Key: `1x0000000000000000000000000000000AA`

## Project Structure

```
invite-markets/
├── app/
│   ├── api/
│   │   ├── access/check/        # Check whitelist access cookie
│   │   ├── auth/verify/         # SIWE signature verification
│   │   ├── invite/verify/       # Validate invite code & set cookie
│   │   ├── listings/            # Listing CRUD
│   │   ├── purchase/[slug]/     # x402-protected purchase
│   │   ├── sales/[slug]/        # Seller sales data
│   │   └── waitlist/            # Waitlist submissions
│   ├── admin/                   # Admin dashboard
│   ├── app/[slug]/              # App-specific page
│   ├── apps/                    # All apps browser
│   ├── components/
│   │   ├── AccessGateProvider   # Whitelist access control
│   │   ├── WaitlistModal        # Waitlist signup form
│   │   ├── ConnectButton/       # Thirdweb wallet connection
│   │   └── ...
│   ├── invite/[code]/           # Invite code verification
│   ├── listing/[slug]/          # Listing detail page
│   ├── profile/[slug]/          # Seller profile
│   └── sell/                    # Create listing
├── data/
│   └── featuredApps.ts          # Featured app configs
├── lib/
│   ├── mongoose.ts              # DB connection
│   ├── signature.ts             # EIP-712 verification
│   └── ...
├── models/
│   ├── listing.ts               # Listing schema
│   ├── waitlist.ts              # Waitlist schema
│   └── transaction.ts           # Transaction schema
└── public/images/               # App icons & assets
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Payments:** x402 Protocol (USDC on Base)
- **Database:** MongoDB + Mongoose
- **Wallet:** Thirdweb SDK
- **Reputation:** Ethos Network
- **Captcha:** Cloudflare Turnstile
- **Animations:** Framer Motion
- **Styling:** Tailwind CSS

## Security

- EIP-712 typed data signatures for listings
- SIWE (Sign-In with Ethereum) for admin access
- Cloudflare Turnstile captcha protection
- HTTP-only cookies for access tokens
- Server-side signature verification
- MongoDB injection protection via Mongoose
- Invite URLs only revealed after payment

## Deployment

Deploy to Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy
