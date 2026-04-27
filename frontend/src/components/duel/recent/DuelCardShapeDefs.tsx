import { getCardShapePath } from './cardShapes';

export const DUEL_CARD_CLIP_IDS = {
  tab: 'duel-card-clip-tab',
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
      </defs>
    </svg>
  );
}
