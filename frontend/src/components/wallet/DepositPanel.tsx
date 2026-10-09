'use client';

import { ArrowLeft, Fuel, Info, LogIn, TriangleAlert } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { DepositAddress } from '@/components/wallet/DepositAddress';
import { DepositBalance } from '@/components/wallet/DepositBalance';
import { FaucetButton } from '@/components/wallet/FaucetButton';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useUsdtBalance } from '@/hooks/useUsdtBalance';
import { useTranslation } from '@/i18n/useTranslation';
import { AVAILABLE_CHAINS } from '@/lib/constants';
import { type BalanceStatus, getDepositCopyKeys, resolveBalanceStatus, resolveFunding } from '@/lib/deposit';
import { cn, formatUSDT } from '@/lib/utils';

interface DepositPanelProps {
  /** The network to receive on — the duel's, never whichever network the wallet is connected to. */
  chainId: number;
  /** The wager the player is topping up for, if any. */
  requiredRaw?: bigint;
  /** Joining: say plainly that topping up holds no seat in the duel. */
  isJoining?: boolean;
  /** Return to the duel review; shown whenever the panel sits inside a duel flow. */
  onBack?: () => void;
  /**
   * The flow's own balance read, when the panel sits inside a duel flow: the panel and the review
   * gate then show one answer from one poll. Without it the panel reads the balance itself.
   */
  flowBalance?: { balance: BalanceStatus; retry: () => void };
}

export function DepositPanel({ chainId, requiredRaw, isJoining = false, onBack, flowBalance }: DepositPanelProps) {
  const { t } = useTranslation();
  const { ready, authenticated, login } = usePrivy();
  const { activeWallet, walletAddress } = useActiveWallet();
  const chain = AVAILABLE_CHAINS.find((candidate) => candidate.id === chainId);
  // Logged out, logging out or Privy still loading: no address at all, never a stale one.
  const address = ready && authenticated && walletAddress ? activeWallet?.address : undefined;
  const relay = useRelayerStatus(chainId);
  const ownRead = useUsdtBalance(chainId, walletAddress, !flowBalance && !!chain && !!address);
  const balance = flowBalance?.balance
    ?? resolveBalanceStatus(ownRead.read, address && walletAddress ? { chainId, walletAddress } : null);
  const retryBalance = flowBalance?.retry ?? ownRead.refetch;

  const backButton = onBack && (
    <Button type="button" variant="outline" onClick={onBack} className="h-11 w-full sm:w-auto sm:self-start">
      <ArrowLeft className="h-4 w-4" />
      {t('deposit.backToDuel')}
    </Button>
  );

  if (!chain) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {t('deposit.networkUnavailable')}
        </p>
        {backButton}
      </div>
    );
  }

  if (!address) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm text-slate-700">
            {ready && authenticated ? t('toast.walletNotReady') : t('deposit.loginPrompt')}
          </p>
          {!authenticated && (
            <Button type="button" onClick={login} disabled={!ready} className="h-11 px-4">
              <LogIn className="h-4 w-4" />
              {t('nav.connectWallet')}
            </Button>
          )}
        </div>
        {backButton}
      </div>
    );
  }

  const copy = getDepositCopyKeys({
    testnet: chain.testnet,
    isRelayResolved: relay.isRelayResolved,
    isRelayEnabled: relay.isRelayEnabled,
  });
  const funding = requiredRaw === undefined ? null : resolveFunding(balance, requiredRaw);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xl font-bold text-slate-900 sm:text-2xl">{t(copy.token)}</span>
        <span className="text-xl text-slate-300 sm:text-2xl" aria-hidden>·</span>
        <span className="text-xl font-bold text-slate-900 sm:text-2xl">{chain.name}</span>
        {chain.testnet && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
            {t('wallet.testnetBadge')}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
        {copy.instructions.map(({ key, warning }) => (
          <li
            key={key}
            className={cn('flex items-start gap-1.5', warning && 'font-medium text-amber-700')}
          >
            {warning && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{t(key, { chain: chain.name })}</span>
          </li>
        ))}
      </ul>

      <DepositAddress key={address} address={address} />

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <DepositBalance
          label={t('deposit.balance.label', { chain: chain.name })}
          balance={balance}
          onRetry={retryBalance}
        />
        <p className="text-xs text-slate-500">{t('deposit.balance.autoUpdate')}</p>
        {requiredRaw !== undefined && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-sm">
            <span className="text-slate-600">{t('deposit.required', { amount: formatUSDT(requiredRaw) })}</span>
            {funding?.kind === 'short' && (
              <span className="font-semibold text-amber-700">
                {t('deposit.short', { amount: formatUSDT(funding.shortfallRaw) })}
              </span>
            )}
            {funding?.kind === 'enough' && (
              <span className="font-semibold text-emerald-700">{t('deposit.enough')}</span>
            )}
          </div>
        )}
      </div>

      {copy.fees && (
        <p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500">
          <Fuel className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t(copy.fees, { chain: chain.name })}</span>
        </p>
      )}

      <FaucetButton chainId={chain.id} />

      {isJoining && (
        <p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t('deposit.joinNotHeld')}</span>
        </p>
      )}

      {backButton}
    </div>
  );
}
