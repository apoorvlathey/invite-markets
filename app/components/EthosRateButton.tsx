"use client";

import Image from "next/image";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface EthosRateButtonProps {
  address: string;
  label?: string;
  className?: string;
}

export function EthosRateButton({
  address,
  label = "Rate on Ethos",
  className = "",
}: EthosRateButtonProps) {
  return (
    <a
      href={`https://app.ethos.network/profile/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-emerald-500/10 via-zinc-800/80 to-rose-500/10 hover:from-emerald-500/20 hover:via-zinc-700/80 hover:to-rose-500/20 border border-zinc-600/50 hover:border-zinc-500 rounded-lg transition-all group ${className}`}
    >
      <ThumbsUp className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
      <div className="flex items-center gap-2">
        <Image
          src="/images/ethos.svg"
          alt="Ethos"
          width={18}
          height={18}
          className="opacity-80 group-hover:opacity-100 transition-opacity"
        />
        <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
          {label}
        </span>
      </div>
      <ThumbsDown className="w-4 h-4 text-rose-400 group-hover:text-rose-300 transition-colors" />
    </a>
  );
}

