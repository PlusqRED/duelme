"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  interactive?: boolean;
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, interactive, children, ...props },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.18 }}
      className={cn(
        "glass rounded-2xl p-4 shadow-card",
        interactive && "cursor-pointer active:bg-elevated",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-3 flex items-center justify-between", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-base font-semibold tracking-tight", className)}>{children}</h3>;
}

export function CardSubtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs text-muted", className)}>{children}</p>;
}

export function CardRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1", className)}>
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  );
}
