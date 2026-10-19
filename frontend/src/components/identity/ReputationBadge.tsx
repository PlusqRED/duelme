'use client';

import { ReputationPill } from '@/components/identity/ReputationPill';
import { useReputation } from '@/hooks/useReputation';
import { cn } from '@/lib/utils';

interface ReputationBadgeProps {
  address: `0x${string}` | undefined;
  chainId: number;
  showStats?: boolean;
  /** Dark puts the stats in light text, for a badge on a dark surface. */
  tone?: 'light' | 'dark';
}

/**
 * A player's level, read from the contract, with their record beside it on request; nothing when
 * the read failed, rather than calling a player of unknown record New.
 */
export function ReputationBadge({ address, chainId, showStats = false, tone = 'light' }: ReputationBadgeProps) {
  const { honored, total, score, level, isLoading, isError } = useReputation(address, chainId);

  if (isLoading || !address) {
    return <span className="inline-flex h-6 w-20 animate-pulse rounded-full bg-canvas-deep" />;
  }
  if (isError) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <ReputationPill level={level} />
      {showStats && total > 0 && (
        <span className={cn('text-note tabular-nums', tone === 'dark' ? 'text-paper/80' : 'text-ink-3')}>
          {honored}/{total} · {score >= 0 ? Math.round(score * 100) : 0}%
        </span>
      )}
    </span>
  );
}
