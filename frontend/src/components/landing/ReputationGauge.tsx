'use client';

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Icon } from '@/components/ui/icon';
import type { SampleChange } from '@/hooks/useReputationSample';
import { useTranslation } from '@/i18n/useTranslation';
import { getReputationLabelKey, reputationLevels, type ReputationLevel } from '@/lib/reputation';
import type { GaugePoint } from '@/lib/reputationGauge';
import { cn } from '@/lib/utils';

const zoneLooks: Record<ReputationLevel, { bar: string; ink: string }> = {
  new: { bar: 'border-2 border-dashed border-level-new-ink', ink: 'text-level-new-ink' },
  unreliable: { bar: 'bg-orange', ink: 'text-orange-ink' },
  fair: { bar: 'bg-sun', ink: 'text-sun-ink' },
  honorable: { bar: 'bg-good', ink: 'text-good-ink' },
};

/**
 * Where on the scale, in pixels from its left, the pin stands: `spot` of the way across the zone
 * at `index`, measured from the zone itself, since a long level name widens its column. Null until
 * measured; measured again whenever the scale changes size.
 */
function usePinX(scale: RefObject<HTMLDivElement | null>, index: number, spot: number): number | null {
  const [x, setX] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = scale.current;
    if (!node) return;
    const place = () => {
      const zone = node.children[index];
      if (zone instanceof HTMLElement) setX(zone.offsetLeft + zone.offsetWidth * spot);
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(node);
    return () => observer.disconnect();
  }, [scale, index, spot]);

  return x;
}

interface ReputationGaugeProps {
  point: GaugePoint;
  /** The last change: the pin glides to its new place, and a +1 rises from it, only after one. */
  change: SampleChange | null;
  /** The sample player's face, standing on the scale. */
  face: ReactNode;
}

/**
 * The reputation scale, New to Reliable, with the sample player standing on it where their
 * record puts them; their level's zone stands out and its name is in its colour. A picture of
 * what the verdict beside it says, so screen readers skip it. On the narrowest phones the zones
 * keep their share of the width and a long name breaks with a hyphen instead.
 */
export function ReputationGauge({ point, change, face }: ReputationGaugeProps) {
  const { t } = useTranslation();
  const scaleRef = useRef<HTMLDivElement>(null);
  const pinX = usePinX(scaleRef, reputationLevels.indexOf(point.level), point.spot);
  const mark = change?.mark === 'reset' ? null : change?.mark;

  return (
    <div aria-hidden="true" className="relative">
      <div
        ref={scaleRef}
        className="grid grid-cols-[0.6fr_1fr_1fr_1fr] items-center gap-x-1.5 gap-y-3 pt-[58px] text-center text-sm font-label text-ink-3 @max-[380px]/lab:text-xs @max-[300px]/lab:grid-cols-[minmax(0,0.6fr)_repeat(3,minmax(0,1fr))] @max-[300px]/lab:text-micro"
      >
        {reputationLevels.map((level) => (
          <span
            key={level}
            data-on={level === point.level || undefined}
            className={cn(
              'h-3.5 rounded-full opacity-30 transition-[opacity,scale] duration-400 ease-spring data-on:scale-y-145 data-on:opacity-100',
              zoneLooks[level].bar
            )}
          />
        ))}
        {reputationLevels.map((level) => (
          <span
            key={level}
            className={cn(
              '@max-[300px]/lab:hyphens-auto @max-[300px]/lab:[overflow-wrap:break-word]',
              level === 'new' && 'whitespace-nowrap',
              level === point.level && cn('font-extrabold', zoneLooks[level].ink)
            )}
          >
            {t(getReputationLabelKey(level))}
          </span>
        ))}
      </div>
      {pinX !== null && (
        <span
          style={{ '--pin-x': `${pinX}px` }}
          className={cn('absolute top-0 left-0 translate-x-(--pin-x)', change && 'transition-[translate] duration-650 ease-spring')}
        >
          <span className="relative grid w-11 -translate-x-1/2 justify-items-center after:mt-0.5 after:border-6 after:border-transparent after:border-t-ink">
            <span className="block size-11 rounded-full bg-paper p-[3px] shadow-pin ring-2 ring-ink">{face}</span>
            {mark && (
              <span
                key={change?.id}
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-[calc(100%+2px)] mx-auto inline-flex w-fit animate-float-up items-center gap-[3px] rounded-full py-0.5 pr-2 pl-1.5 text-note font-extrabold whitespace-nowrap text-paper',
                  mark === 'honored' ? 'bg-good-ink' : 'bg-orange-ink'
                )}
              >
                <Icon name={mark === 'honored' ? 'check' : 'x'} className="size-[13px] stroke-3" />
                +1
              </span>
            )}
          </span>
        </span>
      )}
    </div>
  );
}
