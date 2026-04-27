export const LG_COLUMN_COUNT = 3;

export type DuelCardShape = 'none' | 'tab';

export function getCardShapeForIndex(
  index: number,
  total: number,
  columns: number = LG_COLUMN_COUNT,
): DuelCardShape {
  const hasTab = index < total - 1 && (index + 1) % columns !== 0;
  return hasTab ? 'tab' : 'none';
}

const RX = 0.045;
const RY = 0.06;
const TAB_ZONE = 0.06;
const OPENING_TOP = 0.41;
const OPENING_BOT = 0.59;

export function getCardShapePath(shape: DuelCardShape): string {
  const hasTab = shape === 'tab';
  const right = hasTab ? 1 - TAB_ZONE : 1;

  const segments: string[] = [];

  segments.push(`M ${RX} 0`);
  segments.push(`L ${right - RX} 0`);
  segments.push(`A ${RX} ${RY} 0 0 1 ${right} ${RY}`);

  if (hasTab) {
    segments.push(`L ${right} ${OPENING_TOP}`);
    segments.push(`Q ${1 + TAB_ZONE} 0.5 ${right} ${OPENING_BOT}`);
  }
  segments.push(`L ${right} ${1 - RY}`);
  segments.push(`A ${RX} ${RY} 0 0 1 ${right - RX} 1`);

  segments.push(`L ${RX} 1`);
  segments.push(`A ${RX} ${RY} 0 0 1 0 ${1 - RY}`);
  segments.push(`L 0 ${RY}`);
  segments.push(`A ${RX} ${RY} 0 0 1 ${RX} 0`);

  segments.push('Z');

  return segments.join(' ');
}
