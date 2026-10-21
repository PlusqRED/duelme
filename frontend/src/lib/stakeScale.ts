import { MAX_WAGER_SLIDER } from '@/lib/constants';

/**
 * The stake slider's scale. Its marks are the contract's minimum, the app's presets and the slider's
 * end, set at equal distances, so a stake of 0.3 and one of 500 are both easy to reach; between two
 * marks a stake moves in a step that fits its size.
 */

/** The stakes most duels are made with: the slider's marks between its ends. */
export const STAKE_PRESETS: readonly number[] = [3, 5, 10, 25, 50, 100];

/** This close to a mark, in pixels, a drag clicks into it. */
export const DETENT_PX = 9;

/** Cells between two marks: up to four on a wide bar, fewer on a phone, so each stays a chunky cell. */
const CELLS_PER_SPAN = { most: 4, least: 2 };
const CELL_PITCH_PX = 14;

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The slider's marks, from the contract's minimum to its end; a raised minimum drops the presets under it. */
export function stakeStops(minWager: number): number[] {
  // A minimum at or past the slider's end still leaves the slider a span to move in.
  const max = Math.max(MAX_WAGER_SLIDER, minWager * 10);
  return [minWager, ...STAKE_PRESETS.filter((preset) => preset > minWager && preset < max), max];
}

/** The step a stake moves in between two marks, from the lower one: tenths up to 5, then halves, ones and fives. */
export function stepFrom(stop: number): number {
  if (stop < 5) return 0.1;
  if (stop < 10) return 0.5;
  if (stop < 100) return 1;
  return 5;
}

function spanAt(stops: readonly number[], position: number): number {
  const spans = stops.length - 1;
  return Math.min(spans - 1, Math.floor(clamp(position, 0, 1) * spans));
}

/** The stake at a place on the slider, from 0 to 1, on the step of the span it falls in. */
export function stakeAt(stops: readonly number[], position: number): number {
  const spans = stops.length - 1;
  const index = spanAt(stops, position);
  const from = stops[index];
  const to = stops[index + 1];
  const raw = from + (to - from) * (clamp(position, 0, 1) * spans - index);
  const step = stepFrom(from);
  return round6(Math.min(to, from + Math.round((raw - from) / step) * step));
}

/** Where a stake sits on the slider, from 0 to 1; one past either end sits at that end. */
export function positionOf(stops: readonly number[], stake: number): number {
  const spans = stops.length - 1;
  if (stake <= stops[0]) return 0;
  if (stake >= stops[spans]) return 1;
  let index = 0;
  while (stake >= stops[index + 1]) index += 1;
  return (index + (stake - stops[index]) / (stops[index + 1] - stops[index])) / spans;
}

/** Where a drag at `position` lands on a slider `widthPx` wide: in a mark's detent, or on the nearest step. */
export function landingAt(
  stops: readonly number[],
  position: number,
  widthPx: number
): { position: number; stake: number; mark: number | null } {
  const spans = stops.length - 1;
  const mark = Math.round(clamp(position, 0, 1) * spans);
  if (Math.abs(position - mark / spans) * widthPx <= DETENT_PX) {
    return { position: mark / spans, stake: stops[mark], mark };
  }
  return { position, stake: stakeAt(stops, position), mark: null };
}

/** The next mark up or down from `stake`; the first mark when no stake is set. */
export function nextMark(stops: readonly number[], stake: number | null, direction: 1 | -1): number {
  if (stake === null) return stops[0];
  if (direction > 0) return stops.find((stop) => stop > stake) ?? stops[stops.length - 1];
  return [...stops].reverse().find((stop) => stop < stake) ?? stops[0];
}

/** One step up or down from `stake`, inside the slider's ends; the first mark when no stake is set. */
export function nudge(stops: readonly number[], stake: number | null, direction: 1 | -1): number {
  const min = stops[0];
  const max = stops[stops.length - 1];
  if (stake === null) return min;
  let index = stops.findIndex((stop, i) => i < stops.length - 1 && stake < stops[i + 1]);
  if (index < 0) index = stops.length - 2;
  // Going down from a mark moves in the step of the span below it.
  if (direction < 0 && stake === stops[index] && index > 0) index -= 1;
  return round6(clamp(stake + direction * stepFrom(stops[index]), min, max));
}

/** How many cells each span between two marks gets on a bar `widthPx` wide. */
export function cellsPerSpan(widthPx: number, spans: number): number {
  return clamp(Math.floor(widthPx / spans / CELL_PITCH_PX), CELLS_PER_SPAN.least, CELLS_PER_SPAN.most);
}
