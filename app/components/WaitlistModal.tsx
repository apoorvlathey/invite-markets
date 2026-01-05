"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { CheckCircle, Loader2, Sparkles, Key } from "lucide-react";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

interface WaitlistModalProps {
  onSuccess?: () => void;
}

export function WaitlistModal({ onSuccess }: WaitlistModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [xUsername, setXUsername] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [showAccessCodeInput, setShowAccessCodeInput] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.trim()) {
      router.push(`/invite/${accessCode.trim()}`);
    }
  };

  const submitForm = async (token: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          xUsername: xUsername || undefined,
          turnstileToken: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Reset turnstile on error so user can retry
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        setShowTurnstile(false);
        throw new Error(data.error || "Failed to join waitlist");
      }

      setIsSuccess(true);
      setTurnstileToken(null); // Clear single-use token after successful submission
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
      setPendingSubmit(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // If we already have a token, submit directly
    if (turnstileToken) {
      await submitForm(turnstileToken);
      return;
    }

    // Check turnstile token - if not ready, show the widget and wait
    if (TURNSTILE_SITE_KEY) {
      setShowTurnstile(true);
      setPendingSubmit(true);
      return;
    }

    // No turnstile configured, submit without token
    await submitForm("");
  };

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
    setShowTurnstile(false);

    // Auto-submit if user was waiting for verification
    if (pendingSubmit) {
      submitForm(token);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background - matches layout.tsx */}
      <div className="absolute inset-0 bg-black">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Primary cyan orb - top left */}
          <div
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, rgba(6, 182, 212, 0.8) 0%, rgba(6, 182, 212, 0) 70%)",
              filter: "blur(60px)",
            }}
          />
          {/* Purple orb - top right */}
          <div
            className="absolute -top-20 -right-32 w-[700px] h-[700px] rounded-full opacity-35"
            style={{
              background:
                "radial-gradient(circle, rgba(168, 85, 247, 0.8) 0%, rgba(168, 85, 247, 0) 70%)",
              filter: "blur(60px)",
            }}
          />
          {/* Blue orb - center */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-25"
            style={{
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0) 70%)",
              filter: "blur(80px)",
            }}
          />
          {/* Cyan orb - bottom left */}
          <div
            className="absolute -bottom-32 -left-20 w-[550px] h-[550px] rounded-full opacity-35"
            style={{
              background:
                "radial-gradient(circle, rgba(34, 211, 238, 0.7) 0%, rgba(34, 211, 238, 0) 70%)",
              filter: "blur(50px)",
            }}
          />
        </div>

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
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        {isSuccess ? (
          /* Success State */
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 animate-scale-in">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              You&apos;re on the list!
            </h2>
            <p className="text-zinc-400 text-lg">
              We&apos;ll notify you when invite.markets is live.
            </p>
          </div>
        ) : (
          /* Form State */
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 animate-scale-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-sm font-medium text-cyan-300">
                Coming Soon
              </span>
            </div>

            {/* Header */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
                Join the Waitlist
              </span>
            </h1>
            <p className="text-zinc-400 text-lg mb-8">
              Be first to experience invite.markets
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                disabled={isSubmitting}
              />

              {/* X Username Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-500">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={xUsername}
                  onChange={(e) => setXUsername(e.target.value)}
                  placeholder="@handle (optional)"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              {/* Turnstile Captcha - Shows only when needed */}
              {TURNSTILE_SITE_KEY && showTurnstile && !turnstileToken && (
                <div className="flex justify-center">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={handleTurnstileSuccess}
                    onError={() => {
                      setTurnstileToken(null);
                      setIsSubmitting(false);
                    }}
                    onExpire={() => {
                      setTurnstileToken(null);
                      setShowTurnstile(true);
                      setIsSubmitting(false);
                    }}
                    options={{
                      theme: "dark",
                    }}
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in">
                  {error}
                </div>
              )}

              {/* Submit Button - Primary CTA with gradient */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Waitlist
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Twitter link with gradient border */}
            <div className="relative mt-8 inline-block group">
              {/* Gradient border */}
              <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity" />
              {/* Button content */}
              <a
                href="https://x.com/invitemarkets"
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-zinc-900 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-cyan-500/20 transition-colors">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 fill-zinc-400 group-hover:fill-cyan-400 transition-colors"
                    aria-hidden="true"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                  Follow @invitemarkets
                </span>
              </a>
            </div>

            {/* Footer text */}
            <p className="mt-6 text-zinc-600 text-sm">
              The marketplace for early access to web3 apps
            </p>
          </div>
        )}
      </div>

      {/* Access Code Input - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-50">
        {showAccessCodeInput ? (
          <form
            onSubmit={handleAccessCodeSubmit}
            className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg p-2"
          >
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access code"
              autoFocus
              className="w-32 px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
            <button
              type="submit"
              className="px-2 py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 rounded transition-colors cursor-pointer"
            >
              Go
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAccessCodeInput(false);
                setAccessCode("");
              }}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAccessCodeInput(true)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Enter access code"
          >
            <Key className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
