"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import Image from "next/image";

const ONBOARDING_STORAGE_KEY = "@invite-market/onboarded";

interface OnboardingModalProps {
  forceShow?: boolean;
  onClose?: () => void;
}

interface Step {
  icon?: LucideIcon;
  iconImage?: string;
  title: string;
  description: string;
  color: string;
}

const steps: Step[] = [
  {
    icon: Sparkles,
    title: "Skip the waitlist",
    description:
      "Stop begging for invites. Browse the marketplace and get instant access to exclusive web3 apps.",
    color: "cyan",
  },
  {
    iconImage: "/images/usdc.svg",
    title: "Pay in USDC",
    description:
      "Gasless payments powered by x402. Pay a few dollars, save hours of waiting.",
    color: "emerald",
  },
  {
    iconImage: "/images/ethos.svg",
    title: "Trust, verified",
    description: "Check seller reputation via Ethos before you buy.",
    color: "purple",
  },
  {
    icon: Zap,
    title: "Sell & earn instantly",
    description:
      "Got spare invites? List them in seconds, earn USDC the moment someone buys.",
    color: "amber",
  },
];

// Check localStorage outside of component to determine initial state
function getInitialOpenState(forceShow?: boolean): boolean {
  if (forceShow) return true;
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
}

export function OnboardingModal({ forceShow, onClose }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const shouldOpen = getInitialOpenState(forceShow);
    if (shouldOpen) {
      if (forceShow) {
        // Show immediately when force triggered (e.g., from Help button)
        setCurrentStep(0); // Reset to first step
        setIsOpen(true);
      } else {
        // Small delay for better UX on first visit
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [forceShow]);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsOpen(false);
    onClose?.();
  };

  const getColorClasses = (color: string) => {
    const colors: Record<
      string,
      { bg: string; border: string; text: string; glow: string }
    > = {
      cyan: {
        bg: "bg-cyan-500/20",
        border: "border-cyan-500/40",
        text: "text-cyan-400",
        glow: "shadow-cyan-500/30",
      },
      emerald: {
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/40",
        text: "text-emerald-400",
        glow: "shadow-emerald-500/30",
      },
      purple: {
        bg: "bg-purple-500/20",
        border: "border-purple-500/40",
        text: "text-purple-400",
        glow: "shadow-purple-500/30",
      },
      amber: {
        bg: "bg-amber-500/20",
        border: "border-amber-500/40",
        text: "text-amber-400",
        glow: "shadow-amber-500/30",
      },
    };
    return colors[color] || colors.cyan;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - uses modal-backdrop for mobile optimization */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 modal-backdrop z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-lg w-full"
            >
              {/* Outer glow effect - hidden on mobile for performance */}
              <div className="hidden md:block absolute -inset-1 bg-linear-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-70" />

              {/* Main modal */}
              <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                {/* Gradient accent bar */}
                <div className="h-1 bg-linear-to-r from-cyan-500 via-purple-500 to-cyan-500" />

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all cursor-pointer z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="px-6 sm:px-8 pt-8 sm:pt-10 pb-6 sm:pb-8 text-center">
                  {/* Logo badge - simplified animation */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <span className="text-sm font-medium text-cyan-300">
                      Welcome to invite.markets
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                    <span className="text-white">The marketplace for</span>
                    <br />
                    <span className="bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                      early access to web3 apps
                    </span>
                  </h2>

                  {/* x402 badge */}
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 mt-6 flex-wrap">
                    <span>Powered by</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      x402 Protocol
                    </span>
                    <span>on</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
                      <Image
                        src="/images/base.svg"
                        alt="Base"
                        width={14}
                        height={14}
                      />
                      Base
                    </span>
                  </div>
                </div>

                {/* Steps carousel - simplified for mobile */}
                <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                  {/* Fixed height container to prevent layout shift */}
                  <div className="relative min-h-[120px]">
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        key={currentStep}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0"
                      >
                        {(() => {
                          const step = steps[currentStep];
                          const colors = getColorClasses(step.color);
                          const Icon = step.icon;

                          return (
                            <div
                              className={`rounded-xl p-4 sm:p-5 h-full ${colors.bg} border ${colors.border}`}
                            >
                              <div className="flex items-start gap-3 sm:gap-4 h-full">
                                <div
                                  className={`shrink-0 p-2.5 sm:p-3 rounded-xl ${colors.bg} border ${colors.border} overflow-hidden`}
                                >
                                  {step.iconImage ? (
                                    <Image
                                      src={step.iconImage}
                                      alt=""
                                      width={24}
                                      height={24}
                                      className="w-5 h-5 sm:w-6 sm:h-6"
                                    />
                                  ) : Icon ? (
                                    <Icon
                                      className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`}
                                    />
                                  ) : null}
                                </div>
                                <div>
                                  <h3 className="font-bold text-white text-base sm:text-lg mb-1">
                                    {step.title}
                                  </h3>
                                  <p className="text-zinc-400 text-sm leading-relaxed">
                                    {step.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Step indicators */}
                  <div className="flex justify-center gap-2 mt-6 sm:mt-8">
                    {steps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentStep(index)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          index === currentStep
                            ? "w-6 bg-cyan-500"
                            : "w-1.5 bg-zinc-700 hover:bg-zinc-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Footer - CSS hover instead of Framer Motion */}
                <div className="px-6 sm:px-8 pb-8 sm:pb-10">
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    {/* Navigation arrows */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentStep((prev) => prev - 1)}
                        disabled={currentStep === 0}
                        className={`hover-scale w-10 h-10 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                          currentStep === 0
                            ? "border-zinc-800 text-zinc-600 cursor-not-allowed"
                            : "border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentStep((prev) => prev + 1)}
                        disabled={currentStep === steps.length - 1}
                        className={`hover-scale w-10 h-10 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                          currentStep === steps.length - 1
                            ? "border-zinc-800 text-zinc-600 cursor-not-allowed"
                            : "border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
                        }`}
                      >
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>

                    {/* CTA Button - CSS hover instead of Framer Motion */}
                    <button
                      onClick={handleClose}
                      className="hover-scale px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-semibold text-sm sm:text-base text-black bg-linear-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      {currentStep === steps.length - 1 ? (
                        <>
                          Get Started
                          <Sparkles className="w-4 h-4" />
                        </>
                      ) : (
                        <>Explore Invites</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
