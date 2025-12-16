# Setting Up CDP Facilitator (Alternative Option)

> **Note:** This guide is for reference purposes. The project currently uses the **X402rs facilitator** from the `facilitators` package, which requires **no API keys**. However, if you want to use the CDP facilitator for production, follow these instructions.

## Why Use CDP Facilitator?

The CDP (Coinbase Developer Platform) facilitator offers:

- ✅ Enterprise-grade infrastructure
- ✅ Built-in compliance and KYT/OFAC screening
- ✅ Official Coinbase support
- ✅ Automatic listing in x402 Bazaar for discovery
- ❌ Requires CDP API keys (free to create)

## Getting CDP API Keys

### Step 1: Create a CDP Account

1. Go to [CDP Portal](https://portal.cdp.coinbase.com/)
2. Sign in or create a new account (free)

### Step 2: Create API Keys

1. Navigate to [API Keys](https://portal.cdp.coinbase.com/projects/api-keys)
2. Click **"Create API key"**
3. Choose **"Secret API Key"** (not Client API Key)
4. Download and securely store your API key file

You'll receive:

- `CDP_API_KEY_ID` - Your API key ID
- `CDP_API_KEY_SECRET` - Your API key secret (keep this safe!)

### Step 3: Add to Environment Variables

Update your `.env.local` file:

```env
# Your wallet address
X402_WALLET_ADDRESS=0xYourWalletAddress

# Network configuration
X402_NETWORK=base

# CDP API Keys (for CDP facilitator)
CDP_API_KEY_ID=your_api_key_id_here
CDP_API_KEY_SECRET=your_api_key_secret_here
```

## Switching to CDP Facilitator

### Option 1: Using the `facilitators` Package

```typescript
// middleware.ts
import { paymentMiddleware } from "x402-next";
import { coinbase } from "facilitators"; // Import CDP facilitator

export const middleware = paymentMiddleware(
  (process.env.X402_WALLET_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  {
    "/api/random": {
      price: "$0.01",
      network: "base",
      config: {
        description: "Random Number Generation Service",
        // ... other config
      },
    },
  },
  coinbase // Use CDP facilitator (requires CDP API keys in env)
);

export const config = {
  matcher: ["/api/random/:path*"],
};
```

### Option 2: Using `@coinbase/x402` Package Directly

If you prefer to use the official Coinbase package:

1. **Install the package:**

```bash
pnpm add @coinbase/x402
```

2. **Update middleware:**

```typescript
// middleware.ts
import { paymentMiddleware } from "x402-next";
import { facilitator } from "@coinbase/x402";

export const middleware = paymentMiddleware(
  (process.env.X402_WALLET_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  {
    "/api/random": {
      price: "$0.01",
      network: "base",
      config: {
        description: "Random Number Generation Service",
        // ... other config
      },
    },
  },
  facilitator // Uses CDP API keys from environment
);

export const config = {
  matcher: ["/api/random/:path*"],
  runtime: "nodejs", // Required for @coinbase/x402
};
```

3. **Update Next.js config (if needed):**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // May need experimental features depending on Next.js version
};

export default nextConfig;
```

## Testing CDP Facilitator

1. **Restart your dev server:**

```bash
pnpm dev
```

2. **Verify in logs** that CDP facilitator is being used

3. **Test on Base Sepolia first** before going to mainnet

4. **Check x402 Bazaar** - Your endpoint should be automatically listed when using CDP facilitator with proper metadata

## CDP Facilitator Features

### Automatic Discovery

When using the CDP facilitator with proper `outputSchema` in your middleware config, your API will be automatically:

- Listed in the [x402 Bazaar](https://x402.org/bazaar)
- Discoverable by AI agents
- Searchable by developers

### Compliance Features

CDP facilitator includes:

- KYT (Know Your Transaction) screening
- OFAC compliance checking
- Transaction monitoring
- Enterprise-grade security

### Supported Networks

CDP facilitator supports:

- **Base** (mainnet)
- **Base Sepolia** (testnet)
- **Solana** (mainnet)
- **Solana Devnet** (testnet)

## Comparison: PayAI vs CDP

| Feature         | PayAI (Current)       | CDP Facilitator         |
| --------------- | --------------------- | ----------------------- |
| **Setup**       | ✅ No API keys needed | ❌ Requires CDP account |
| **Networks**    | BASE, SOLANA          | BASE, SOLANA            |
| **Discovery**   | ✅ Yes (AI agents)    | ✅ Automatic in Bazaar  |
| **Compliance**  | ❌ No built-in        | ✅ KYT/OFAC included    |
| **Support**     | Community             | Official Coinbase       |
| **Cost**        | Free                  | Free                    |
| **Reliability** | Community-operated    | Enterprise-grade        |

## When to Use Each

### Use PayAI (Current Setup) When:

- ✅ You want simplicity (no API keys)
- ✅ You're building a prototype or MVP
- ✅ You need resource discovery for AI agents
- ✅ You prefer community-operated infrastructure
- ✅ You want SOLANA network support

### Use CDP Facilitator When:

- ✅ You need enterprise-grade reliability
- ✅ You want automatic discovery in x402 Bazaar
- ✅ You require compliance features (KYT/OFAC)
- ✅ You need official Coinbase support
- ✅ You're building a production application

## Security Best Practices

1. ✅ **Never commit** `.env.local` or API keys to git
2. ✅ **Keep API secrets safe** - treat them like passwords
3. ✅ **Use environment variables** in production (Vercel, Railway, etc.)
4. ✅ **Rotate keys periodically** for security
5. ✅ **Test on Base Sepolia** before going to mainnet
6. ✅ **Monitor your CDP usage** in the portal

## Resources

- [CDP Portal](https://portal.cdp.coinbase.com/)
- [CDP Documentation](https://docs.cdp.coinbase.com/x402/welcome)
- [x402 Bazaar](https://x402.org/bazaar)
- [CDP Discord](https://discord.com/invite/cdp)
- [facilitators Package](https://github.com/Merit-Systems/x402scan/tree/main/packages/facilitators)

## Support

For CDP-specific issues:

- [CDP Support](https://www.coinbase.com/developer-platform/support)
- [CDP Discord](https://discord.com/invite/cdp)

For x402 protocol issues:

- [x402 Discord](https://discord.gg/cdp)
- [x402 GitHub](https://github.com/coinbase/x402)
