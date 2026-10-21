'use client';

import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

const facts: readonly { icon: IconName; text: TranslationKey }[] = [
  { icon: 'key', text: 'onboarding.fact1' },
  { icon: 'withdraw', text: 'onboarding.fact2' },
  { icon: 'unlock', text: 'onboarding.fact3' },
];

interface ControlFactsProps {
  className?: string;
}

/** What a wallet made for the player leaves in their hands. */
export function ControlFacts({ className }: ControlFactsProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('border-t border-line pt-5', className)}>
      <h3 className="text-lg">{t('onboarding.sideTitle')}</h3>
      <ul className="mt-3.5 grid gap-3">
        {facts.map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-ink-2">
            <span className="grid size-9 flex-none place-items-center rounded-xl bg-good-soft text-good-ink">
              <Icon name={icon} className="size-5" />
            </span>
            {t(text)}
          </li>
        ))}
      </ul>
    </div>
  );
}
