'use client';

import { useId, useState } from 'react';
import { formatUnits } from 'viem';
import { StepError, StepLead } from '@/components/duel/create/SetupStep';
import { StakeCharge } from '@/components/duel/create/StakeCharge';
import { StakeSum } from '@/components/duel/create/StakeSum';
import { WalletPurse } from '@/components/duel/create/WalletPurse';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import type { BalanceStatus, FundingStatus } from '@/lib/balanceStatus';
import { USDT_DECIMALS } from '@/lib/constants';
import { formatUSDT, parseUSDT } from '@/lib/utils';
import { cleanWagerInput, formatWagerInput, type WagerReading } from '@/lib/wagerInput';

interface StakeStepBodyProps {
  stakeText: string;
  reading: WagerReading;
  minWager: number;
  /** The slider's marks, from the minimum to its end. */
  stops: readonly number[];
  isOpen: boolean;
  isSignedIn: boolean;
  balance: BalanceStatus;
  funding: FundingStatus;
  onStakeText: (text: string) => void;
  onContinue: () => void;
  onTopUp: () => void;
  onRetryBalance: () => void;
  /** A stake set on the slider: the arena's planned stakes bump with the sum. */
  onRipple: () => void;
}

/**
 * The stake step: the amount typed as people type it (4,2 and 4.2 are one stake), the slider, which
 * follows the field and sets it, the duel's sum, and the wallet's balance with Top up when it is
 * short. Continue takes a stake the contract would take.
 */
export function StakeStepBody(props: StakeStepBodyProps) {
  const { stakeText, reading, minWager, stops, isOpen, isSignedIn, balance, funding } = props;
  const { t, language } = useTranslation();
  const inputId = useId();
  const errorId = useId();
  const sumId = useId();
  const [rippleKey, setRippleKey] = useState(0);
  const [countEpoch, setCountEpoch] = useState(0);
  const isValid = reading.kind === 'valid';
  const format = (stake: number) => formatUSDT(parseUSDT(stake), language);
  const limit = balance.kind === 'ready' ? Number(formatUnits(balance.raw, USDT_DECIMALS)) : null;

  function slide(stake: number, isSettled: boolean) {
    props.onStakeText(formatWagerInput(stake, language));
    if (!isSettled) {
      setCountEpoch((epoch) => epoch + 1);
      return;
    }
    setRippleKey((key) => key + 1);
    props.onRipple();
  }

  return (
    <>
      <StepLead>{t('create.stake.lead')}</StepLead>
      <div className="relative max-w-[420px]">
        <label htmlFor={inputId} className="sr-only">
          {t('create.stake.label')}
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          value={stakeText}
          aria-invalid={reading.kind === 'invalid'}
          aria-describedby={`${errorId} ${sumId}`}
          onChange={(event) => props.onStakeText(cleanWagerInput(event.target.value))}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (isValid) props.onContinue();
          }}
          className="h-[72px] w-full rounded-[20px] border-[1.5px] border-line-strong bg-paper pr-[92px] pl-5 text-4xl font-extrabold tracking-[-0.03em] text-ink tabular-nums transition-[border-color] duration-200 outline-none placeholder:text-line-strong focus:border-ink aria-invalid:border-orange"
        />
        <span className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-[1.0625rem] font-strong text-ink-3">USDT</span>
      </div>
      <StakeCharge
        stops={stops}
        stake={reading.kind === 'empty' ? null : reading.value}
        isInvalid={reading.kind === 'invalid'}
        limit={isSignedIn ? limit : null}
        format={format}
        label={t('create.stake.slider')}
        emptyText={t('create.stake.none')}
        shouldHint={isOpen && reading.kind === 'empty'}
        onChange={slide}
        onEnter={() => isValid && props.onContinue()}
      />
      <StepError id={errorId}>
        {reading.kind === 'invalid' &&
          (reading.reason === 'decimals' ? t('create.decimals') : t('create.min', { min: format(minWager) }))}
      </StepError>
      <StakeSum id={sumId} raw={isValid ? reading.raw : null} rippleKey={rippleKey} countEpoch={countEpoch} />
      <WalletPurse isSignedIn={isSignedIn} balance={balance} funding={funding} onTopUp={props.onTopUp} onRetry={props.onRetryBalance} />
      <div className="flex flex-wrap gap-x-2.5 gap-y-2">
        <Button type="button" disabled={!isValid} onClick={props.onContinue}>
          {t('create.step.continue')}
        </Button>
      </div>
    </>
  );
}
