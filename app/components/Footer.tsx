"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { OnboardingModal } from "./OnboardingModal";

const footerLinks = {
  product: [
    { label: "All Listings", href: "/listings" },
    { label: "Browse Apps", href: "/apps" },
    { label: "Sell Invites", href: "/sell" },
  ],
  resources: [
    {
      label: "GitHub",
      href: "https://github.com/apoorvlathey/invite-markets",
      external: true,
    },
  ],
  social: [
    { label: "Twitter", href: "https://x.com/invitemarkets", external: true },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <footer className="relative mt-auto border-t border-zinc-800/50">
      {/* Subtle gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg transition-all flex items-center justify-center">
                <Image
                  src="/icon.png"
                  alt="Invite.markets"
                  width={16}
                  height={16}
                  className="w-6 h-6 object-cover"
                />
              </div>
              <span className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                invite.markets
              </span>
            </Link>
            <p className="mt-4 text-sm text-zinc-500 leading-relaxed max-w-xs">
              Buy and sell early access to the hottest web3 apps — instantly.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-medium text-cyan-300">
                Powered by x402
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              {/* Help button that triggers onboarding modal */}
              <li>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  Help
                </button>
              </li>
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <svg
                      className="w-3 h-3 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
              Connect
            </h4>
            <ul className="space-y-3">
              {footerLinks.social.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <svg
                      className="w-3 h-3 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-zinc-800/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-600">
              © {currentYear} invite.markets. All rights reserved.
            </p>

            {/* Built on Base badge */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-600">Built on</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                <svg className="w-4 h-4" viewBox="0 0 111 111" fill="none">
                  <path
                    d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H0C2.35281 87.8625 26.0432 110.034 54.921 110.034Z"
                    fill="#0052FF"
                  />
                </svg>
                <span className="text-xs font-medium text-zinc-400">Base</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Modal triggered by Help */}
      {showOnboarding && (
        <OnboardingModal
          forceShow={true}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </footer>
  );
}
