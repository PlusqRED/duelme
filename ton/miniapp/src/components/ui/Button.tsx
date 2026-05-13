"use client";

import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// A tactile, mobile-first button. Tap target is always >= 44px high. The
// spring on press is intentionally subtle — Telegram users notice the lack
// of feedback far more than they notice flashy effects.
const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50 active:opacity-80",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg shadow-card hover:brightness-105",
        secondary: "glass text-text hover:bg-elevated",
        ghost: "text-text/90 hover:bg-elevated",
        danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/20",
        link: "text-link underline-offset-4 hover:underline",
        success: "bg-success/15 text-success border border-success/30 hover:bg-success/20",
      },
      size: {
        sm: "min-h-9 px-3 text-sm",
        md: "min-h-11 px-4 text-sm",
        lg: "min-h-12 px-5 text-base",
        block: "h-12 w-full text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, icon, children, disabled, ...props },
  ref,
) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      ref={ref}
      className={cn(buttonStyles({ variant, size }), className)}
      disabled={disabled || loading}
      {...(props as Record<string, unknown>)}
    >
      {loading ? <Spinner /> : icon}
      <span>{children}</span>
    </motion.button>
  );
});

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}
