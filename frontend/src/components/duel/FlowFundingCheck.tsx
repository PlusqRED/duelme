'use client';

import { TopUpWindow } from '@/components/topup/TopUpWindow';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { BalanceReadFailed } from '@/components/wallet/BalanceReadFailed';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
import { useTranslation } from '@/i18n/useTranslation';
import type { BalanceStatus } from '@/lib/balanceStatus';
import { formatUSDT } from '@/lib/utils';

interface FlowFundingCheckProps {
  review: FlowReviewGate;
  chainId: number;
  chainName: string;
  /** What the duel takes, in USDT's smallest unit. */
  neededRaw: bigint;
  isJoining: boolean;
}

/**
 * The balance line on the create and join review steps: the player's balance on the duel's
 * network, and — only once a fresh read shows it is short — how much is missing and Top up, which
 * opens the top-up window over the flow, told what the duel needs.
 */
export function FlowFundingCheck({ review, chainId, chainName, neededRaw, isJoining }: FlowFundingCheckProps) {
  const { t, language } = useTranslation();
  const { activeWallet, walletAddress } = useActiveWallet();
  const { funding, blockedReason } = review;
  const { balance, status } = funding;

  return (
    <div className="mt-4 grid gap-2 rounded-tile bg-canvas px-4 py-3">
      <p aria-live="polite" className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="text-ink-2">{t('topup.yours', { network: chainName })}</span>
        <BalanceValue balance={balance} />
      </p>
      {balance.kind === 'error' && <BalanceReadFailed onRetry={funding.retry} />}
      {/* A duel this player can no longer join is no reason to top up. */}
      {status.kind === 'short' && !blockedReason && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-strong text-orange-ink">
            {t('topup.short', { amount: formatUSDT(status.shortfallRaw, language) })}
          </span>
          <Button type="button" size="sm" onClick={funding.openTopUp}>
            <Icon name="plus" className="size-[18px]" />
            {t('topup.action')}
          </Button>
        </div>
      )}
      {blockedReason && (
        <p role="alert" className="text-sm font-label text-orange-ink">
          {t(blockedReason)}
        </p>
      )}
      {activeWallet && walletAddress && balance.kind !== 'no-wallet' && (
        <TopUpWindow
          address={activeWallet.address}
          walletAddress={walletAddress}
          chainId={funding.isTopUpOpen ? chainId : null}
          duel={{ neededRaw, isJoining, funding: { balance, retry: funding.retry } }}
          onClose={funding.closeTopUp}
        />
      )}
    </div>
  );
}

function BalanceValue({ balance }: { balance: BalanceStatus }) {
  const { t, language } = useTranslation();

  switch (balance.kind) {
    case 'ready':
      return <b className="font-strong tabular-nums">{formatUSDT(balance.raw, language)}&nbsp;USDT</b>;
    case 'checking':
      return <span className="text-ink-3">{t('topup.checking')}</span>;
    case 'no-wallet':
      return <span className="text-ink-3">{t('toast.walletNotReady')}</span>;
    case 'error':
      return <span className="text-ink-3">—</span>;
  }
}
