'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useGames } from '@/hooks/useGames';
import { useTranslation } from '@/i18n/useTranslation';
import { Gamepad2 } from 'lucide-react';

interface GameAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
}

export function GameAutocomplete({ value, onChange }: GameAutocompleteProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { games } = useGames(undefined, debouncedSearch || undefined);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Gamepad2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v);
            setSearch(v);
            setOpen(v.length > 0);
          }}
          onFocus={() => { if (value.length > 0) setOpen(true); }}
          placeholder={t('create.gamePlaceholder')}
          maxLength={50}
          className="h-11 border-slate-200 bg-white pl-10"
        />
      </div>
      {open && games.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {games.slice(0, 8).map((game) => (
            <li key={game.slug}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onChange(game.name);
                  setOpen(false);
                }}
              >
                <Gamepad2 className="h-3.5 w-3.5 text-slate-400" />
                <span>{game.name}</span>
                <span className="ml-auto text-xs text-slate-400">{game.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && !open && (
        <p className="mt-1 text-xs text-slate-400">{t('create.gameHint')}</p>
      )}
    </div>
  );
}
