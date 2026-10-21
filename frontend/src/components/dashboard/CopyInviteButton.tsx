'use client';

import { useSyncExternalStore } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES, ZERO_ADDRESS } from '@/lib/constants';
import { buildInviteLink, readStoredInviteSecret } from '@/lib/invite';
import { cn, subscribeToNothing } from '@/lib/utils';

/**
 * Copy the link to a private duel waiting for its opponent: the full invite, from the secret this
 * browser kept for its creator. A browser without it offers nothing, rather than a bare link that
 * cannot let anyone in.
 */
export function CopyInviteButton({ duelId }: { duelId: number }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyFeedback('toast.copyFailed');
  const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID] ?? ZERO_ADDRESS;
  const secret = useSyncExternalStore(
    subscribeToNothing,
    () => readStoredInviteSecret(DEFAULT_CHAIN_ID, contractAddress, duelId),
    () => null
  );

  if (!secret) return null;

  return (
    <button
      type="button"
      onClick={() => void copy(buildInviteLink(duelId, secret))}
      className={cn(
        buttonVariants({ size: 'sm' }),
        'px-3.5',
        copied && 'bg-good-ink [--keycap-edge:var(--color-good-edge)]'
      )}
    >
      <Icon name={copied ? 'check' : 'copy'} className={cn('size-[18px]', copied && 'animate-pop')} />
      {t(copied ? 'wallet.copied' : 'dash.go.copy')}
    </button>
  );
}
