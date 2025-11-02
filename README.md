# x402 Random Number API

A Next.js API for random number generation protected by [x402 payment middleware](https://www.npmjs.com/package/x402-next). This project demonstrates how to monetize API endpoints using the x402 protocol.

## Features

- 🎲 Random number generation API
- 💰 Payment-gated access via x402 middleware (0.01 USDC per request)
- ⚡ Built with Next.js 16 and TypeScript
- 🎨 Modern UI with Tailwind CSS
- 🔒 Secure payment verification on Base and Base Sepolia networks

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- A wallet address on Base or Base Sepolia for receiving USDC payments

### Installation

1. Clone the repository:

```bash
git clone https://github.com/apoorvlathey/x402-random-number.git
cd x402-random-number
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables:

Copy `.env.example` to `.env.local` and fill in your configuration:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Your wallet address to receive payments (Base/Base Sepolia)
X402_WALLET_ADDRESS=0xYourWalletAddressHere

# Network to use: "base" or "base-sepolia"
X402_NETWORK=base-sepolia
```

**Note:** The cost is fixed at 0.01 USDC per request and is configured in `middleware.ts`.

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Usage

### Endpoint

```
POST /api/random
```

### Request Body Parameters

- `min` (optional): Minimum value for random number (default: 1)
- `max` (optional): Maximum value for random number (default: 100)

### Example Request

```bash
curl -X POST http://localhost:3000/api/random \
  -H "Content-Type: application/json" \
  -d '{"min": 1, "max": 100}'
```

### Example Response

```json
{
  "success": true,
  "randomNumber": 42,
  "range": { "min": 1, "max": 100 },
  "timestamp": "2025-11-02T00:00:00.000Z",
  "cost": "0.01 USDC",
  "network": "base-sepolia"
}
```

## How x402 Works

The x402 middleware intercepts API requests and verifies payment before allowing access to the protected endpoint. Here's how it works:

1. Client makes a request to the API endpoint
2. x402 middleware checks for payment verification (0.01 USDC on Base/Base Sepolia)
3. If payment is valid, the request proceeds to the handler
4. If payment is invalid/missing, the middleware returns a payment request with a paywall
5. Client completes payment (via wallet or Coinbase Onramp) and retries the request
6. Request succeeds with the API response

The payment is made in USDC on either Base (mainnet) or Base Sepolia (testnet) networks.

## Project Structure

```
x402-random-number/
├── app/
│   ├── api/
│   │   └── random/
│   │       └── route.ts      # Random number API endpoint
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page with API documentation
├── middleware.ts              # x402 payment middleware configuration
├── public/                    # Static assets
├── .env.example               # Environment variables template
├── .env.local                 # Your local environment variables (git-ignored)
├── package.json               # Dependencies
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Configuration

### Cost Settings

The cost of accessing the API is **fixed at 0.01 USDC** per request and is configured in `middleware.ts`. The payment is made in USDC on either:

- **Base** (mainnet) - for production use
- **Base Sepolia** (testnet) - for testing and development

### Network Configuration

Set the `X402_NETWORK` environment variable to either `base` or `base-sepolia`:

- Use `base-sepolia` for development and testing (testnet USDC)
- Use `base` for production (real USDC)

**No API keys required!** This project uses the [PayAI facilitator](https://github.com/Merit-Systems/x402scan/tree/main/packages/facilitators) via the official `facilitators` package from x402scan, which supports Base and Solana networks with built-in resource discovery for AI agents.

#### Alternative: CDP Facilitator

For production environments, you can also use the CDP (Coinbase Developer Platform) facilitator. See [CDP_SETUP.md](CDP_SETUP.md) for detailed instructions on setting up CDP API keys and using the CDP facilitator.

### Wallet Configuration

You need to provide a wallet address to receive USDC payments on the Base network. Set this in the `X402_WALLET_ADDRESS` environment variable. This should be a valid Ethereum/Base address (0x...).

## Deployment

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/apoorvlathey/x402-random-number)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard:
   - `X402_WALLET_ADDRESS` - Your Base wallet address for receiving payments
   - `X402_NETWORK` - Set to `base` for production or `base-sepolia` for testing
4. Deploy!

### Other Platforms

This is a standard Next.js application and can be deployed to any platform that supports Next.js:

- Netlify
- AWS Amplify
- Railway
- Render
- Self-hosted with Docker

## Technologies Used

- [Next.js 16](https://nextjs.org/) - React framework
- [x402-next](https://www.npmjs.com/package/x402-next) - Payment middleware
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Base](https://base.org/) - Layer 2 blockchain for fast, low-cost USDC payments

## Security Considerations

- Never commit your `.env.local` file or expose your wallet credentials
- Use a dedicated wallet address for receiving API payments
- Consider rate limiting for production use
- Monitor your wallet for unusual activity
- Validate all user inputs before processing
- Use `base-sepolia` for testing before deploying to production on `base`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Learn More

- [x402 Protocol Documentation](https://github.com/coinbase/x402)
- [x402-next Package](https://www.npmjs.com/package/x402-next)
- [Base Network](https://base.org/)
- [CDP Documentation](https://docs.cdp.coinbase.com/)
- [CDP Discord](https://discord.com/invite/cdp)

## Support

For issues and questions:

- Open an issue on [GitHub](https://github.com/apoorvlathey/x402-random-number/issues)
- Check the [x402-next documentation](https://www.npmjs.com/package/x402-next)

---

Built with ❤️ using x402 and Next.js
