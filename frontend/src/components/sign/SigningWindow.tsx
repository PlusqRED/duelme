'use client';

import { useEffect, useRef, useState } from 'react';
import { SignCheck, type CheckFix } from '@/components/sign/SignCheck';
import { SignProgress } from '@/components/sign/SignProgress';
import { SignRail } from '@/components/sign/SignRail';
import { SignDone, SignError } from '@/components/sign/SignResult';
import type { ItemFee } from '@/components/sign/SignList';
import type { SigningModel } from '@/components/sign/signingModel';
import { TopUpWindow } from '@/components/topup/TopUpWindow';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useLastNonNull } from '@/hooks/useLastNonNull';
import { useSignGas } from '@/hooks/useSignGas';
import { useSigningPress } from '@/hooks/useSigningPress';
import { useTakingLong } from '@/hooks/useTakingLong';
import { useTranslation } from '@/i18n/useTranslation';
import { isBusy, railStatuses, railSteps, signingSpot } from '@/lib/signingSteps';
import { cn, formatUSDT } from '@/lib/utils';
import { EMBEDDED_WALLET_CLIENT_TYPE } from '@/lib/walletSelection';

/**
 * The one window every duel action is signed in: what it does and needs, the wallet asked step by
 * step, the chain confirming it, and how it went. A card that grows downwards on a wide screen, a
 * sheet on a phone. While the wallet or the chain works on a step it cannot be closed: that would
 * hide a result that is coming.
 */
export function SigningWindow({ model }: { model: SigningModel }) {
  const { t, language } = useTranslation();
  const { activeWallet, walletAddress } = useActiveWallet();
  const { place, actionState, signing, route, items, stake } = model;
  const spot = signingSpot({ place, actionState, failedWhile: signing.failedWhile, route });
  const steps = railSteps({
    route,
    showNetwork: model.showNetwork || spot.step === 'network',
    showApprove: items.some((item) => item.part === 'approve'),
  });
  const statuses = railStatuses(steps, spot);
  const canClose = model.canClose && !isBusy(spot);
  const { press } = useSigningPress({ place: model.open ? place : null, actionState, run: model.run });
  const isConfirming = model.open && actionState === 'confirming';
  const isSlow = useTakingLong(isConfirming) || (isConfirming && model.wasLeft === true);
  const lastHash = useLastNonNull(signing.hash ?? null);

  const unpaid = place === 'success' ? [] : items.filter((item) => item.kind === 'transaction' && !(item.part === 'approve' && model.approved));
  const gas = useSignGas({ open: model.open, chainId: model.chainId, route, unpaid });
  const fees: (ItemFee | null)[] = items.map((item) => {
    if (item.kind !== 'transaction') {
      return null;
    }
    if (item.part === 'approve' && model.approved) {
      return { wei: signing.feePaidWei, paid: true };
    }
    const wei = gas.feeOf(item.gas, item.gasTimes);
    return wei === null ? null : { wei, paid: false };
  });

  // Money that lands while the top-up window is open charges the stake's cells once it closes.
  const [chargeFrom, setChargeFrom] = useState<bigint | undefined>(undefined);
  const stakeBalance = stake?.funding.balance;
  const stakeRaw = stakeBalance?.kind === 'ready' ? stakeBalance.raw : undefined;
  const usdt = stake && {
    needRaw: stake.needRaw,
    balance: stake.funding.balance,
    side: stake.side,
    fromRaw: stake.funding.isTopUpOpen ? undefined : chargeFrom,
  };
  const status = stake?.funding.status;

  // What the main button does before signing while the wallet lacks something. A balance that could
  // not be read is read again first: every other fix depends on it.
  function checkFix(): CheckFix | null {
    const readAgain = (onFix: () => void): CheckFix => ({ label: t('sign.retry'), icon: 'replay', busy: false, onFix });
    if (stake && stakeBalance?.kind === 'error') {
      return readAgain(stake.funding.retry);
    }
    if (gas.eth?.balance.kind === 'error') {
      return readAgain(gas.retryEth);
    }
    if (stake && status?.kind === 'short' && !model.blockedReason) {
      return {
        label: t('sign.need.topUp', { amount: formatUSDT(status.shortfallRaw, language) }),
        icon: 'plus',
        busy: false,
        onFix: () => {
          setChargeFrom(stakeRaw);
          stake.funding.openTopUp();
        },
      };
    }
    if (gas.fix === 'faucet') {
      return { label: t('wallet.faucet'), icon: 'flask', busy: gas.isFaucetBusy, onFix: gas.claimFaucet };
    }
    return gas.fix === 'topUpEth' ? { label: t('sign.need.topUpEth'), icon: 'plus', busy: false, onFix: gas.openTopUp } : null;
  }

  function start() {
    press();
    model.onContinue();
  }

  function retry() {
    if (place === 'review' || place === 'success') {
      start();
      return;
    }
    press(place);
    model.run[place]();
  }

  function startStep() {
    if (place !== 'review' && place !== 'success') {
      press(place);
      model.run[place]();
    }
  }

  // A new stage slides in; a stage updating itself (the chain ticking) does not, nor the first one.
  const moment = `${spot.step}:${spot.failed}:${spot.phase === 'chain'}:${spot.step === 'sign' ? signing.phase : ''}`;
  // The stage the window opened on, null once it has moved on, undefined while it is closed.
  const [firstMoment, setFirstMoment] = useState<string | null | undefined>(model.open ? moment : undefined);
  if (!model.open && firstMoment !== undefined) {
    setFirstMoment(undefined);
  } else if (model.open && firstMoment === undefined) {
    setFirstMoment(moment);
  } else if (model.open && typeof firstMoment === 'string' && firstMoment !== moment) {
    setFirstMoment(null);
  }
  const hasMoved = firstMoment === null;
  const body = useRef<HTMLDivElement>(null);
  // Keyboard focus follows the flow to the way on of each new stage, or to the stage itself while
  // it waits on the wallet or the chain: on the close button it would sit on a control that is off.
  const stageFocus = () => body.current?.querySelector<HTMLElement>('[data-primary]') ?? body.current;
  useEffect(() => {
    if (hasMoved) {
      stageFocus()?.focus({ preventScroll: true });
    }
  }, [moment, hasMoved]);

  return (
    <Dialog open={model.open} onOpenChange={(open) => !open && canClose && model.onClose()}>
      <DialogContent
        showCloseButton={false}
        initialFocus={() => stageFocus() ?? true}
      >
        <header className="flex items-center gap-3">
          <span
            className={cn(
              'grid size-11 flex-none place-items-center rounded-[14px]',
              model.copy.sun ? 'bg-sun text-ink shadow-[0_3px_0_var(--color-sun-edge)]' : 'bg-ink text-paper shadow-[0_3px_0_var(--color-ink-edge)]'
            )}
          >
            <Icon name={model.copy.icon} className="size-[22px]" />
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <DialogTitle>{model.title}</DialogTitle>
            <DialogDescription>{model.sub}</DialogDescription>
          </span>
          <button
            type="button"
            onClick={canClose ? model.onClose : undefined}
            aria-disabled={!canClose || undefined}
            aria-label={t('sign.close')}
            className="grid size-11 flex-none cursor-pointer place-items-center rounded-full border border-line bg-paper text-ink-2 transition-[border-color,color,opacity] duration-200 hover:border-line-strong hover:text-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-35"
          >
            <Icon name="x" />
          </button>
        </header>
        {spot.step === 'check' && !spot.failed && (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-center text-body-sm text-balance text-ink-2">{model.caption}</p>
        )}
        <SignRail steps={steps.map((step, index) => ({ step, status: statuses[index] }))} />
        <div
          key={moment}
          ref={body}
          tabIndex={-1}
          className={cn('grid grid-cols-[minmax(0,1fr)] gap-3.5 outline-none', hasMoved && '*:animate-swap [&>*:nth-child(n+2)]:[animation-delay:40ms]')}
        >
          {spot.failed && model.error ? (
            <SignError model={model} error={model.error} sentByWallet={route === 'self' && spot.step !== 'network'} onRetry={retry} />
          ) : spot.step === 'check' ? (
            <SignCheck model={model} fees={fees} usdt={usdt} eth={gas.eth} fix={checkFix()} onStart={start} />
          ) : spot.step === 'done' ? (
            <SignDone model={model} hash={lastHash} />
          ) : (
            <SignProgress
              model={model}
              spot={spot}
              fees={fees}
              hash={signing.hash}
              isSlow={isSlow}
              isInAppWallet={activeWallet?.walletClientType === EMBEDDED_WALLET_CLIENT_TYPE}
              onStartStep={startStep}
            />
          )}
        </div>
        {activeWallet && walletAddress && stake && stakeBalance && stakeBalance.kind !== 'no-wallet' && (
          <TopUpWindow
            address={activeWallet.address}
            walletAddress={walletAddress}
            chainId={stake.funding.isTopUpOpen ? model.chainId : null}
            duel={{ neededRaw: stake.needRaw, isJoining: stake.isJoining, funding: { balance: stakeBalance, retry: stake.funding.retry } }}
            backKey="topup.back.sign"
            onClose={stake.funding.closeTopUp}
          />
        )}
        {activeWallet && walletAddress && gas.eth && (
          <TopUpWindow
            address={activeWallet.address}
            walletAddress={walletAddress}
            chainId={gas.isTopUpOpen ? model.chainId : null}
            eth={{ neededWei: gas.eth.needWei, balance: gas.eth.balance, retry: gas.retryEth }}
            backKey="topup.back.sign"
            onClose={gas.closeTopUp}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
