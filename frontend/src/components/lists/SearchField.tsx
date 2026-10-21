'use client';

import type { Ref } from 'react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** What can be searched for; it names the field as well. */
  placeholder: string;
  ref?: Ref<HTMLInputElement>;
}

/** A list's search: a magnifier in the field, and a cross that empties it once something is typed. */
export function SearchField({ value, onChange, placeholder, ref }: SearchFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-3" />
      <Input
        ref={ref}
        type="search"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-[52px] pr-13 pl-[46px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('lists.clearSearch')}
          className="group/clear absolute top-1/2 right-1 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:text-ink"
        >
          <Icon name="x" className="size-[18px] animate-pop transition-[rotate] duration-300 ease-spring group-hover/clear:rotate-90" />
        </button>
      )}
    </div>
  );
}
