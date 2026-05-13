"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  suffix?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, helper, error, suffix, className, ...props },
  ref,
) {
  return (
    <label className="block w-full text-text">
      {label && (
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
      )}
      <span
        className={cn(
          "glass relative flex items-center rounded-2xl border border-transparent px-3 py-2 transition",
          "focus-within:border-primary/60 focus-within:shadow-glow",
          error && "border-danger/50",
        )}
      >
        <input
          ref={ref}
          className={cn(
            "min-h-9 w-full bg-transparent text-base outline-none placeholder:text-muted",
            className,
          )}
          {...props}
        />
        {suffix && <span className="ml-2 shrink-0 text-sm text-muted">{suffix}</span>}
      </span>
      {(helper || error) && (
        <span
          className={cn(
            "mt-1.5 block text-xs",
            error ? "text-danger" : "text-muted",
          )}
        >
          {error || helper}
        </span>
      )}
    </label>
  );
});
