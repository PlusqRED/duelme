'use client';

import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';

const options = [
  { isPublic: false, icon: 'lock', title: 'create.access.private', text: 'create.access.private.text' },
  { isPublic: true, icon: 'globe', title: 'create.access.public', text: 'create.access.public.text' },
] as const;

interface AccessStepBodyProps {
  isPublic: boolean;
  onChange: (isPublic: boolean) => void;
  onContinue: () => void;
}

/** Who can join: only someone with the private link, or anyone, the duel listed in Public duels. */
export function AccessStepBody({ isPublic, onChange, onContinue }: AccessStepBodyProps) {
  const { t } = useTranslation();
  const name = useId();

  return (
    <>
      <div role="radiogroup" aria-label={t('create.step.access')} className="grid grid-cols-1 gap-2 min-[620px]:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.title}
            className="group/option relative grid cursor-pointer grid-cols-[44px_minmax(0,1fr)_24px] items-start gap-3 rounded-[18px] border-[1.5px] border-line bg-paper p-3.5 transition-[border-color,box-shadow] duration-200 hover:border-line-strong has-checked:border-ink has-checked:shadow-[0_3px_0_var(--color-ink)] has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-blue"
          >
            <input
              type="radio"
              name={name}
              checked={option.isPublic === isPublic}
              data-first={option.isPublic === isPublic || undefined}
              onChange={() => onChange(option.isPublic)}
              className="sr-only"
            />
            <span className="grid size-11 place-items-center rounded-[13px] bg-canvas text-ink-2 transition-colors duration-200 group-has-checked/option:bg-ink group-has-checked/option:text-paper">
              <Icon name={option.icon} className="size-[22px]" />
            </span>
            <span className="grid gap-0.5">
              <strong className="text-base font-strong">{t(option.title)}</strong>
              <small className="text-sm/[1.45] text-ink-2">{t(option.text)}</small>
            </span>
            <span className="grid size-6 place-items-center rounded-full border-[1.5px] border-line-strong text-paper transition-colors duration-200 group-has-checked/option:border-ink group-has-checked/option:bg-ink">
              <Icon name="check" className="size-3.5 stroke-3 opacity-0 group-has-checked/option:opacity-100" />
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-2.5 gap-y-2">
        <Button type="button" onClick={onContinue}>
          {t('create.step.continue')}
        </Button>
      </div>
    </>
  );
}
