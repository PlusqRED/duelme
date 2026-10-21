'use client';

import { useId } from 'react';
import { StepError, StepLead } from '@/components/duel/create/SetupStep';
import { Avatar } from '@/components/identity/Avatar';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import type { ContractConfig } from '@/lib/contractConfig';
import { countDuelMessageCharacters } from '@/lib/duelMessage';
import { cn } from '@/lib/utils';

interface MessageStepBodyProps {
  /** The field as typed. */
  text: string;
  /** The message as the contract gets it, which the counter and the check judge. */
  message: string;
  isValid: boolean;
  limits: ContractConfig;
  /** Whose face the bubble comes from; null signed out. */
  address: `0x${string}` | null;
  /** A note players made a duel of this game with, else the copy's own example. */
  example: string;
  onChange: (text: string) => void;
  onDone: () => void;
}

/** The message, typed into your own speech bubble: it is what your seat will say. */
export function MessageStepBody({ text, message, isValid, limits, address, example, onChange, onDone }: MessageStepBodyProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const countId = useId();
  const errorId = useId();

  return (
    <>
      <StepLead>{t('create.message.lead')}</StepLead>
      <div className="flex max-w-[520px] items-end gap-3.5">
        <span className="size-10 flex-none">
          {address ? (
            <Avatar address={address} tone="red" className="size-full" />
          ) : (
            <span className="block size-full rounded-full border-2 border-dashed border-red" />
          )}
        </span>
        {/* The tail points at you. */}
        <div className="relative min-w-0 flex-1 rounded-2xl border-[1.5px] border-red bg-paper shadow-[0_3px_0_var(--color-red)] before:absolute before:bottom-3 before:-left-[6.5px] before:size-[11px] before:rotate-45 before:border-b-[1.5px] before:border-l-[1.5px] before:border-red before:bg-paper focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-blue">
          <label htmlFor={inputId} className="sr-only">
            {t('create.message.label')}
          </label>
          <input
            id={inputId}
            type="text"
            data-first
            autoComplete="off"
            value={text}
            placeholder={example}
            aria-invalid={!isValid}
            aria-describedby={`${countId} ${errorId}`}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (isValid) onDone();
            }}
            className="relative h-[52px] w-full rounded-2xl bg-transparent pr-16 pl-4 text-base font-bold text-ink outline-none placeholder:font-medium placeholder:text-ink-3"
          />
          <span
            id={countId}
            className={cn(
              'pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-note font-label text-ink-3 tabular-nums',
              !isValid && 'text-orange-ink'
            )}
          >
            {t('create.message.counter', { count: countDuelMessageCharacters(message), max: limits.maxMessageCharacters })}
          </span>
        </div>
      </div>
      <StepError id={errorId}>{!isValid && t('create.message.tooLong', { max: limits.maxMessageCharacters })}</StepError>
      <div className="flex flex-wrap gap-x-2.5 gap-y-2">
        <Button type="button" variant="paper" disabled={!isValid} onClick={onDone}>
          {t('create.step.done')}
        </Button>
      </div>
    </>
  );
}
