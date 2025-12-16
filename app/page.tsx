"use client";

import { RandomNumberGenerator } from "./components/RandomNumberGenerator";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-zinc-900 to-black font-sans">
      <main className="flex w-full max-w-4xl flex-col items-center gap-12 py-16 px-6">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            x402 Random Number API
          </h1>
          <p className="text-xl text-zinc-400">
            Payment-gated API powered by x402 protocol
          </p>
        </div>

        <RandomNumberGenerator />

        <div className="w-full max-w-2xl bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700 p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              API Endpoint
            </h2>
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
              POST /api/random
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Request Body Parameters
            </h3>
            <div className="space-y-2 text-zinc-300">
              <div className="flex gap-2">
                <code className="bg-zinc-900 px-2 py-1 rounded text-green-400">
                  min
                </code>
                <span>- Minimum value (default: 1)</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-zinc-900 px-2 py-1 rounded text-green-400">
                  max
                </code>
                <span>- Maximum value (default: 100)</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Example Request
            </h3>
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
              {`curl -X POST https://x402-random.vercel.app/api/random \\
  -H "Content-Type: application/json" \\
  -d '{"min": 1, "max": 100}'`}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Example Response
            </h3>
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
              {`{
  "success": true,
  "randomNumber": 42,
  "range": { "min": 1, "max": 100 },
  "timestamp": "2025-11-02T00:00:00.000Z"
}`}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-700">
            <p className="text-sm text-zinc-400">
              💡 This API is protected by{" "}
              <a
                href="https://www.npmjs.com/package/x402-next"
                className="text-blue-400 hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                x402 middleware
              </a>
              , which requires payment before granting access.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <a
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-white font-medium transition-colors hover:bg-blue-700"
            href="https://github.com/apoorvlathey/x402-random-number"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View on GitHub
          </a>
          <a
            className="flex h-12 items-center justify-center rounded-full border border-zinc-600 px-6 text-white font-medium transition-colors hover:bg-zinc-800"
            href="https://www.npmjs.com/package/x402-next"
            target="_blank"
            rel="noopener noreferrer"
          >
            x402-next Docs
          </a>
        </div>
      </main>
    </div>
  );
}
