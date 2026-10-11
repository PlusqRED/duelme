'use client';

import { FlaskConical } from 'lucide-react';
import { useFaucetClaim } from '@/hooks/useFaucetClaim';
import { useTranslation } from '@/i18n/useTranslation';

interface FaucetButtonProps {
  chainId: number;
}

/** The testnet faucet button; renders nothing where the faucet does not operate. */
export function FaucetButton({ chainId }: FaucetButtonProps) {
  const { t } = useTranslation();
  const { canClaim, isClaiming, claim } = useFaucetClaim(chainId);

  if (!canClaim) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void claim()}
      disabled={isClaiming}
      className="flex min-h-11 w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="flex items-center gap-1.5 text-left">
        {isClaiming ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        ) : (
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
        )}
        {t('wallet.claimFaucet')}
      </span>
      <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
        {t('wallet.testnetBadge')}
      </span>
    </button>
  );
}
