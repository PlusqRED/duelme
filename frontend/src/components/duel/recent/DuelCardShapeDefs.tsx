import { getCardShapePath } from './cardShapes';

export const DUEL_CARD_CLIP_IDS = {
  tab: 'duel-card-clip-tab',
  notch: 'duel-card-clip-notch',
  'tab-notch': 'duel-card-clip-tab-notch',
} as const;

export function DuelCardShapeDefs() {
  return (
    <svg
      width="0"
      height="0"
      className="absolute"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath
          id={DUEL_CARD_CLIP_IDS.tab}
          clipPathUnits="objectBoundingBox"
        >
          <path d={getCardShapePath('tab')} />
        </clipPath>
        <clipPath
          id={DUEL_CARD_CLIP_IDS.notch}
          clipPathUnits="objectBoundingBox"
        >
          <path d={getCardShapePath('notch')} />
        </clipPath>
        <clipPath
          id={DUEL_CARD_CLIP_IDS['tab-notch']}
          clipPathUnits="objectBoundingBox"
        >
          <path d={getCardShapePath('tab-notch')} />
        </clipPath>
      </defs>
    </svg>
  );
}
