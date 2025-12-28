"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface InviteClientProps {
  code: string;
  isValidCode: boolean;
}

export function InviteClient({ code, isValidCode }: InviteClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    isValidCode ? "loading" : "error"
  );

  useEffect(() => {
    if (!isValidCode) {
      setStatus("error");
      return;
    }

    // Call API to set cookie
    const verifyAndRedirect = async () => {
      try {
        const response = await fetch("/api/invite/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (response.ok) {
          setStatus("success");
          // Short delay to show success message
          setTimeout(() => {
            router.push("/");
          }, 1000);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    verifyAndRedirect();
  }, [code, isValidCode, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-cyan-500/20 border border-cyan-500/40">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Verifying Access...
          </h1>
          <p className="text-zinc-400 text-lg">Please wait a moment</p>
        </motion.div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/40"
          >
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Access Granted!
          </h1>
          <p className="text-zinc-400 text-lg">Redirecting you now...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-red-500/20 border border-red-500/40">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Invalid Invite Code
        </h1>
        <p className="text-zinc-400 text-lg mb-8">
          The invite code you used is not valid. Please check your link and try
          again.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
        >
          Go to Homepage
        </a>
      </motion.div>
    </div>
  );
}

