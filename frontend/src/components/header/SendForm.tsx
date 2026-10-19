'use client';

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { USDT_DECIMALS } from '@/lib/constants';
import type { FaucetOffer } from '@/lib/faucetApi';
import { parseTransfer, parseUsdtAmount, sendProblems, type SendDraft, type SendProblems, type Transfer } from '@/lib/sendUsdt';
import { cn, formatEth, formatUSDT } from '@/lib/utils';
import { readingRaw } from '@/lib/walletBalances';

const TO_PROBLEM: Record<NonNullable<SendProblems['to']>, TranslationKey> = {
  address: 'send.err.address',
  self: 'send.err.self',
};

interface SendFormProps {
  address: string;
  network: NetworkBalances;
  faucetOffer: FaucetOffer;
  draft: SendDraft;
  onDraft: (draft: SendDraft) => void;
  onSubmit: (transfer: Transfer) => void;
}

/**
 * Where to and how much. Its checks wait for the first try to send, then follow every keystroke;
 * the button names the amount as it is typed.
 */
export function SendForm({ address, network, faucetOffer, draft, onDraft, onSubmit }: SendFormProps) {
  const { t, language } = useTranslation();
  const ids = useId();
  const toInput = useRef<HTMLInputElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const [isTried, setIsTried] = useState(false);
  const usdtRaw = readingRaw(network.usdt);
  const ethWei = readingRaw(network.eth);
  const problems = isTried ? sendProblems(draft, { address, usdtRaw, ethWei }) : {};
  const amountRaw = parseUsdtAmount(draft.amount);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsTried(true);
    const found = sendProblems(draft, { address, usdtRaw, ethWei });
    const transfer = parseTransfer(draft);
    if (found.to) {
      toInput.current?.focus();
    } else if (found.amount) {
      amountInput.current?.focus();
    } else if (!found.eth && transfer) {
      onSubmit(transfer);
    }
  }

  function sendAll() {
    if (usdtRaw !== null) {
      onDraft({ ...draft, amount: formatUnits(usdtRaw, USDT_DECIMALS) });
    }
    amountInput.current?.focus();
  }

  const toError = problems.to && t(TO_PROBLEM[problems.to]);
  const amountError =
    problems.amount === 'empty'
      ? t('send.err.empty')
      : problems.amount === 'tooMuch' && usdtRaw !== null
        ? t('send.err.amount', { amount: formatUSDT(usdtRaw, language) })
        : undefined;
  const offersEth = faucetOffer.kind === 'ready' ? ` ${t('send.err.eth.faucet', { eth: formatEth(faucetOffer.ethAmountWei, language) })}` : '';

  return (
    <form noValidate onSubmit={submit} className="grid gap-3">
      <Field id={`${ids}-to`} label={t('send.to')} error={toError}>
        <Input
          ref={toInput}
          id={`${ids}-to`}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('send.to.placeholder')}
          value={draft.to}
          onChange={(event) => onDraft({ ...draft, to: event.target.value })}
          aria-invalid={toError ? true : undefined}
          aria-describedby={toError ? `${ids}-to-error` : undefined}
          className="text-body-sm tabular-nums"
        />
      </Field>
      <Field id={`${ids}-amount`} label={t('send.amount')} error={amountError}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <Input
            ref={amountInput}
            id={`${ids}-amount`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={draft.amount}
            onChange={(event) => onDraft({ ...draft, amount: event.target.value })}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? `${ids}-amount-error` : undefined}
            className="tabular-nums"
          />
          <span className="text-sm font-label text-ink-3">USDT</span>
          <button
            type="button"
            onClick={sendAll}
            className="min-h-11 min-w-[52px] cursor-pointer rounded-full border-[1.5px] border-line-strong bg-paper px-3 text-sm font-bold text-ink hover:border-ink-3"
          >
            {t('send.max')}
          </button>
        </div>
      </Field>
      <Note icon={problems.eth ? 'alert' : 'fuel'} isBad={!!problems.eth}>
        {problems.eth
          ? t('send.err.eth', { network: network.chain.name }) + offersEth
          : t('send.fee', { eth: ethWei === null ? '…' : formatEth(ethWei, language) })}
      </Note>
      <Note icon="alert">{t('send.check')}</Note>
      <Button type="submit" size="lg" className="mt-1 w-full">
        <Icon name="send" />
        {amountRaw ? t('send.button', { amount: formatUSDT(amountRaw, language) }) : t('send.button.empty')}
      </Button>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-label">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-label text-orange-ink">
          {error}
        </p>
      )}
    </div>
  );
}

interface NoteProps {
  icon: 'alert' | 'fuel';
  isBad?: boolean;
  children: string;
}

function Note({ icon, isBad = false, children }: NoteProps) {
  return (
    <p className={cn('flex items-start gap-[7px] text-sm/[1.4] text-ink-2', isBad && 'font-label text-orange-ink')}>
      <Icon name={icon} className={cn('mt-0.5 size-4', isBad ? 'text-orange-ink' : 'text-ink-3')} />
      {children}
    </p>
  );
}
