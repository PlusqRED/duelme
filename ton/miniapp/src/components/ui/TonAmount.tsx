import { Diamond } from "lucide-react";
import { formatTon } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TonAmountProps {
  nano: bigint | number | string;
  precision?: number;
  className?: string;
  tone?: "default" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  showSymbol?: boolean;
}

const sizeStyles = {
  sm: "text-sm gap-1",
  md: "text-base gap-1.5",
  lg: "text-2xl gap-2",
};

const toneStyles = {
  default: "text-text",
  success: "text-success",
  danger: "text-danger",
};

export function TonAmount({
  nano,
  precision = 4,
  className,
  tone = "default",
  size = "md",
  showSymbol = true,
}: TonAmountProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-semibold tracking-tight",
        sizeStyles[size],
        toneStyles[tone],
        className,
      )}
    >
      {showSymbol && <Diamond className="size-3.5 -translate-y-0.5 text-link" aria-hidden />}
      <span>{formatTon(nano, { precision })}</span>
      <span className="text-xs text-muted">TON</span>
    </span>
  );
}
