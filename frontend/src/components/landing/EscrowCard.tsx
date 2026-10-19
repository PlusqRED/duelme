'use client';

import { useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useScrambleReveal } from '@/hooks/useScrambleReveal';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';
import { addressGroups, cn } from '@/lib/utils';

const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
/** The address after its `0x`, in the groups of four it is read out in; one array, so the reveal keeps it. */
const addressHex = addressGroups(contractAddress).slice(1);
const contractPage = `${DEFAULT_CHAIN.explorer}/address/${contractAddress}`;

/** The three ways to check the contract on the explorer, each a tab of its page. */
const checks: readonly { icon: IconName; title: TranslationKey; hint: TranslationKey; tab: string }[] = [
  { icon: 'list', title: 'trust.contract.verify1.title', hint: 'trust.contract.verify1.desc', tab: '' },
  { icon: 'blocks', title: 'trust.contract.verify2.title', hint: 'trust.contract.verify2.desc', tab: '#writeContract' },
  { icon: 'code', title: 'trust.contract.verify3.title', hint: 'trust.contract.verify3.desc', tab: '#code' },
];

const PRESSED_EDGE = 'shadow-[0_3px_0_var(--color-ink-edge)] active:translate-y-0.5 active:shadow-[0_1px_0_var(--color-ink-edge)]';

/**
 * The escrow contract itself: its address, which settles out of noise the first time it is seen,
 * a copy button, and three links that open it on the explorer, one line under them saying what
 * the link pointed at shows.
 */
export function EscrowCard() {
  const { t } = useTranslation();
  const hintId = useId();
  const addressRef = useRef<HTMLParagraphElement>(null);
  const groupsRef = useRef<HTMLSpanElement>(null);
  const isSeen = useSeenOnce(addressRef, 0.8);
  const reveal = useScrambleReveal(addressHex, isSeen, groupsRef);
  const { copied, copy } = useCopyFeedback('wallet.copyFailed', 2200);
  const [hinted, setHinted] = useState(0);

  return (
    <div className="grid gap-2.5 rounded-3xl bg-ink-raised p-[clamp(18px,2.6vw,26px)] inset-ring inset-ring-paper/8">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="inline-flex h-8 items-center gap-2 rounded-full bg-sun/14 pr-3 pl-2.5 text-sm font-bold text-sun">
          <Icon name="shield-check" className="size-[18px]" />
          {t('trust.contract.badge')}
        </p>
        <p className="text-body-sm text-paper/70">{DEFAULT_CHAIN.name}</p>
      </div>

      <p className="mt-1.5 text-sm text-paper/60">
        {t('trust.contract.label')}
      </p>
      <div className="flex items-start gap-3.5">
        <p
          ref={addressRef}
          className="flex flex-1 flex-wrap gap-x-2.5 gap-y-0.5 text-[clamp(1.0625rem,0.85rem+0.8vw,1.4375rem)] font-bold tracking-[0.01em] tabular-nums"
        >
          <span className="sr-only">{contractAddress}</span>
          <span aria-hidden="true" className="text-paper/50">
            0x
          </span>
          <span ref={groupsRef} aria-hidden="true" className="contents">
            {reveal.groups.map((group, index) => (
              // A group's place is its identity: the same four characters can stand at two places.
              <span key={index} style={{ minWidth: reveal.widths[index] }} className="inline-block">
                {group}
              </span>
            ))}
          </span>
        </p>
        <button
          type="button"
          aria-label={t('trust.contract.copy')}
          data-done={copied || undefined}
          onClick={() => void copy(contractAddress)}
          className={cn(
            'mb-[3px] grid size-11 flex-none cursor-pointer place-items-center rounded-[14px] bg-paper/8 text-paper inset-ring inset-ring-paper/20 transition-[background-color,translate,box-shadow] duration-150 ease-press hover:bg-paper/14 data-done:bg-good',
            PRESSED_EDGE
          )}
        >
          <Icon key={String(copied)} name={copied ? 'check' : 'copy'} className={cn('size-5', copied && 'animate-pop')} />
        </button>
      </div>
      <p aria-live="polite" className="-mt-1 min-h-[1.4em] text-sm font-semibold text-sun">
        {copied ? t('trust.contract.copied') : ''}
      </p>

      <p className="mt-1.5 text-sm text-paper/60">{t('trust.check')}</p>
      <div className="grid grid-cols-3 gap-2 max-xs:grid-cols-1">
        {checks.map((check, index) => (
          <a
            key={check.title}
            href={`${contractPage}${check.tab}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-describedby={`${hintId}-${index}`}
            data-active={index === hinted || undefined}
            onMouseEnter={() => setHinted(index)}
            onFocus={() => setHinted(index)}
            className={cn(
              'mb-[3px] flex min-h-[52px] items-center gap-2 rounded-[14px] bg-paper/6 px-3 py-2 text-body-sm/[1.2] font-label text-paper no-underline inset-ring inset-ring-paper/12 transition-[background-color,box-shadow,translate] duration-200 hover:bg-paper/13 hover:inset-ring-[1.5px] hover:inset-ring-sun data-active:bg-paper/13 data-active:inset-ring-[1.5px] data-active:inset-ring-sun',
              PRESSED_EDGE
            )}
          >
            <Icon name={check.icon} className="size-[18px] text-sun" />
            {t(check.title)}
            <Icon name="external" className="ml-auto size-3.5 text-paper/55" />
            <span id={`${hintId}-${index}`} hidden>
              {t(check.hint)}
            </span>
          </a>
        ))}
      </div>
      <p key={hinted} aria-hidden="true" className="min-h-[2.8em] animate-swap text-body-sm text-paper/74">
        {t(checks[hinted].hint)}
      </p>
    </div>
  );
}
