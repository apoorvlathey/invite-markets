"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const TOAST_DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "error") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-dismiss after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const config = {
    error: {
      icon: AlertCircle,
      bgClass: "bg-red-500/10",
      borderClass: "border-red-500/30",
      iconClass: "text-red-400",
      textClass: "text-red-100",
    },
    success: {
      icon: CheckCircle,
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/30",
      iconClass: "text-emerald-400",
      textClass: "text-emerald-100",
    },
    info: {
      icon: Info,
      bgClass: "bg-cyan-500/10",
      borderClass: "border-cyan-500/30",
      iconClass: "text-cyan-400",
      textClass: "text-cyan-100",
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`
        pointer-events-auto
        flex items-center gap-3 
        px-4 py-3 
        min-w-[280px] max-w-[400px]
        ${config.bgClass}
        border ${config.borderClass}
        rounded-lg
        backdrop-blur-xl
        shadow-2xl
      `}
    >
      <Icon className={`h-5 w-5 ${config.iconClass} shrink-0`} />
      <p className={`text-sm font-medium ${config.textClass} flex-1`}>
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
