import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("shimmer animate-shimmer rounded-xl bg-elevated/60", className)} />
  );
}
