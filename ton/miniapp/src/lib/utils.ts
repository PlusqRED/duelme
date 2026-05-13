import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Conditional Tailwind class merger, identical to the one used by shadcn/ui. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Reduce a noisy stack trace / SDK error into a user-facing string. Telegram
 * wallets return a heterogeneous shape — we widen the input to `unknown` so
 * every call site can pass whatever they got from a catch block.
 */
export function explainError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "Unknown error";
  if (typeof err === "object") {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return String(err);
}
