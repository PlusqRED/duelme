"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "default" | "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, opts?: { tone?: ToastTone; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback<ToastContextValue["toast"]>((message, opts) => {
    const id = ++counter.current;
    const tone = opts?.tone ?? "default";
    const duration = opts?.durationMs ?? 3200;
    setItems((cur) => [...cur, { id, message, tone }]);
    setTimeout(() => {
      setItems((cur) => cur.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "glass pointer-events-auto max-w-sm rounded-2xl px-4 py-2.5 text-sm shadow-card",
                "text-text",
                t.tone === "success" && "border-success/40 text-success",
                t.tone === "error" && "border-danger/40 text-danger",
                t.tone === "info" && "border-link/40 text-link",
              )}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
