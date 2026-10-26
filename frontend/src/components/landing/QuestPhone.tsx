'use client';

import { useEffect, useRef } from 'react';
import { BrandMark } from '@/components/identity/BrandMark';
import { QuestScreen } from '@/components/landing/QuestScreens';
import { Button, buttonVariants } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { QUEST_STEPS, type Quest } from '@/hooks/useQuest';
import { useSeenOnce } from '@/hooks/useSeenOnce';
import { useTranslation } from '@/i18n/useTranslation';
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

const CONTROL = 'flex-[1_1_140px] whitespace-nowrap max-xs:basis-full';

interface QuestPhoneProps {
  quest: Quest;
  isRelayEnabled: boolean;
  className?: string;
}

/**
 * The quest acted out on a phone: each step's screen, signed in from the second on, and the way on
 * under it. Only a picture of the steps the list beside it reads out, so screen readers skip it.
 */
export function QuestPhone({ quest, isRelayEnabled, className }: QuestPhoneProps) {
  const { t } = useTranslation();
  const phoneRef = useRef<HTMLDivElement>(null);
  const isSeen = useSeenOnce(phoneRef, 0.6);
  const nextRef = useRef<HTMLButtonElement>(null);
  const createRef = useRef<HTMLAnchorElement>(null);
  const movesFocus = useRef(false);

  // Finish and Go through again go away with the press, so focus moves on to what replaced them:
  // a duel to create after the last step, the first step again after a replay.
  useEffect(() => {
    if (!movesFocus.current) return;
    movesFocus.current = false;
    (quest.isDone ? createRef : nextRef).current?.focus();
  }, [quest.isDone]);

  function next() {
    movesFocus.current = quest.step === QUEST_STEPS;
    quest.next();
  }

  function replay() {
    movesFocus.current = true;
    quest.replay();
  }

  return (
    <div className={cn('grid w-full grid-cols-[minmax(0,1fr)] justify-items-center gap-[18px] self-start', className)}>
      <div
        ref={phoneRef}
        aria-hidden="true"
        className="@container/phone w-full max-w-[360px] rounded-[38px] bg-ink p-2.5 shadow-phone"
      >
        {/* On a narrow phone the bar fits the name or the chips, not all: the mark stands for the
            name, and once signed in "Signed in" takes the Demo tag's place. */}
        <div
          data-signed={quest.reached > 1 || undefined}
          className="group/bar flex items-center gap-2 rounded-t-[28px] bg-canvas px-4 pt-3.5 pb-2 text-body-sm"
        >
          <BrandMark />
          <b className="max-xs:hidden">{SITE_NAME}</b>
          <Chip className="h-[26px] bg-sun-soft px-2.5 font-bold text-sun-ink @max-[275px]/phone:group-data-signed/bar:hidden">
            {t('sim.tag')}
          </Chip>
          <Chip className="ml-auto scale-50 bg-good-soft pl-[7px] text-micro font-extrabold text-good-ink opacity-0 transition-[opacity,scale] duration-400 ease-spring group-data-signed/bar:scale-100 group-data-signed/bar:opacity-100">
            <Icon name="check" className="size-3 stroke-3" />
            {t('start.mock.signedIn')}
          </Chip>
        </div>
        <div className="relative h-[372px] overflow-hidden rounded-b-[28px] bg-canvas max-xs:h-[360px]">
          <QuestScreen
            key={`${quest.reached}-${isSeen}`}
            reached={quest.reached}
            isPlaying={isSeen}
            direction={quest.direction}
            isRelayEnabled={isRelayEnabled}
          />
        </div>
      </div>

      <div className="flex w-full max-w-[360px] flex-wrap justify-center gap-3">
        {quest.isDone ? (
          <>
            <LocaleLink ref={createRef} href="/duel/create" className={buttonVariants({ className: CONTROL })}>
              {t('hero.cta')}
            </LocaleLink>
            <Button variant="paper" onClick={replay} className={CONTROL}>
              {t('start.replay')}
            </Button>
          </>
        ) : (
          <Button ref={nextRef} size="lg" onClick={next} className={CONTROL}>
            {t(quest.step === QUEST_STEPS ? 'start.finish' : 'start.next')}
          </Button>
        )}
      </div>
    </div>
  );
}
