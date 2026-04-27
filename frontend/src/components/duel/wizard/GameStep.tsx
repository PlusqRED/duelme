'use client';

import { GamePicker } from '@/components/game/GamePicker';
import { NetworkChip } from '@/components/duel/wizard/NetworkChip';
import { useTranslation } from '@/i18n/useTranslation';
import type { ChainKey } from '@/lib/constants';
import type { Game } from '@/lib/game';

interface GameStepProps {
  selectedSlug: string;
  onSelect: (game: Game) => void;
  chainKey: ChainKey;
}

export function GameStep({ selectedSlug, onSelect, chainKey }: GameStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none sm:text-2xl">
          {t('wizard.title.game')}
        </h2>
        <p className="text-sm text-slate-500">{t('wizard.subtitle.game')}</p>
        <NetworkChip chainKey={chainKey} />
      </div>

      <GamePicker selectedSlug={selectedSlug} onSelect={onSelect} />
    </div>
  );
}
