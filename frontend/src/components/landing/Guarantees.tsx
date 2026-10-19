'use client';

import { useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { useCountTo } from '@/hooks/useCountTo';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { CONTRACT_TESTS, contractCoverage } from '@/lib/contractFacts';
import { cn, formatCount, formatPercent } from '@/lib/utils';

const guarantees: readonly { icon: IconName; title: TranslationKey; desc: TranslationKey }[] = [
  { icon: 'key', title: 'trust.cred.noncustodial.title', desc: 'trust.cred.noncustodial.desc' },
  { icon: 'code', title: 'trust.cred.verified.title', desc: 'trust.cred.verified.desc' },
  { icon: 'shield-check', title: 'trust.cred.oz.title', desc: 'trust.cred.oz.desc' },
];

/** The coverage ring's radius and stroke, on a 56-unit box: the ring of a medal's size. */
const RING_RADIUS = 25;
const RING_STROKE = 6;
/** The badges unlock one after another; the ring starts filling as its own badge, the last, unlocks. */
const BADGE_STEP_MS = 160;
const RING_DELAY_MS = guarantees.length * BADGE_STEP_MS;

const MEDAL =
  'relative mb-1.5 grid size-14 place-items-center rounded-full transition-[scale,opacity] delay-(--delay) duration-550 ease-spring group-data-pending/badges:scale-30 group-data-pending/badges:opacity-0 max-xs:row-span-2 max-xs:mb-0';

interface GuaranteesProps {
  className?: string;
}

/**
 * Four guarantees as badges that unlock one after another the first time they are seen, a tick
 * landing on each medal; the last is the contract's test coverage, a ring that fills as its
 * figure counts up to the measured one.
 */
export function Guarantees({ className }: GuaranteesProps) {
  const { t, plural, language } = useTranslation();
  const listRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();
  const isUnlocked = useSeenOnce(listRef, 0.5) || reducedMotion;
  const coverage = useCountTo(contractCoverage.percent, isUnlocked, { delayMs: RING_DELAY_MS });
  const tests = `${formatCount(CONTRACT_TESTS, language)} ${plural('trust.tests', CONTRACT_TESTS)}`;

  return (
    <ul
      ref={listRef}
      data-pending={!isUnlocked || undefined}
      className={cn('group/badges grid grid-cols-2 gap-3 wide:grid-cols-4 max-xs:grid-cols-1 max-xs:gap-2.5', className)}
    >
      {guarantees.map(({ icon, title, desc }, index) => (
        <Badge key={title} index={index} medal={<Icon name={icon} className="size-[26px]" />} medalClassName="bg-sun text-ink inset-shadow-avatar ring-5 ring-sun/14">
          <h3 className="text-body/[1.25]">{t(title)}</h3>
          <p className="text-sm text-paper/70">{t(desc)}</p>
        </Badge>
      ))}
      <Badge
        index={guarantees.length}
        medalClassName="text-paper"
        medal={
          <>
            <svg viewBox="0 0 56 56" aria-hidden="true" className="absolute inset-0 -rotate-90">
              <circle cx="28" cy="28" r={RING_RADIUS} fill="none" strokeWidth={RING_STROKE} className="stroke-paper/16" />
              <circle
                cx="28"
                cy="28"
                r={RING_RADIUS}
                fill="none"
                strokeWidth={RING_STROKE}
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={100 - coverage}
                className="stroke-sun"
              />
            </svg>
            <b aria-hidden="true" className="relative text-xs font-extrabold tracking-[-0.02em] tabular-nums">
              {formatPercent(coverage, language)}
            </b>
          </>
        }
      >
        <h3 className="text-body/[1.25]">
          {t('trust.cred.tested.title', { tests, coverage: formatPercent(contractCoverage.percent, language) })}
        </h3>
        <p className="text-sm text-paper/70">{t('trust.cred.tested.desc')}</p>
      </Badge>
    </ul>
  );
}

interface BadgeProps {
  /** Its place in the row: each badge unlocks a beat after the one before. */
  index: number;
  medal: ReactNode;
  medalClassName: string;
  children: ReactNode;
}

function Badge({ index, medal, medalClassName, children }: BadgeProps) {
  return (
    <li
      style={{ '--delay': `${index * BADGE_STEP_MS}ms` }}
      className="relative grid content-start gap-1.5 rounded-[20px] bg-paper/4 p-[18px] inset-ring inset-ring-paper/10 max-xs:grid-cols-[auto_minmax(0,1fr)] max-xs:gap-x-4 max-xs:p-3.5"
    >
      <span className={cn(MEDAL, medalClassName)}>
        {medal}
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -bottom-1.5 z-1 grid size-6 place-items-center rounded-full border-3 border-ink bg-good text-paper transition-[scale] delay-[calc(var(--delay)+320ms)] duration-400 ease-spring group-data-pending/badges:scale-0"
        >
          <Icon name="check" className="size-3 stroke-[3.4]" />
        </span>
      </span>
      {children}
    </li>
  );
}
