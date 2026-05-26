export interface ParsedWager {
  numeric: number;
  pot: number;
  isValidNumber: boolean;
}

export function parseWager(amount: string): ParsedWager {
  const numeric = parseFloat(amount);
  const isValidNumber = Number.isFinite(numeric);
  const safeNumeric = isValidNumber ? numeric : 0;
  return {
    numeric: safeNumeric,
    pot: safeNumeric * 2,
    isValidNumber,
  };
}

export interface SliderRange {
  min: number;
  max: number;
}

export interface SliderState {
  value: number;
  percent: number;
  isAboveRange: boolean;
}

// Projects an arbitrary wager amount onto a fixed slider range. Amounts
// outside [min, max] are clamped for the thumb position, but callers can use
// `isAboveRange` to disable the slider so a drag doesn't silently overwrite
// what the user typed in the text field
export function projectWagerToSlider(numeric: number, { min, max }: SliderRange): SliderState {
  const floor = Number.isFinite(numeric) && numeric >= min ? numeric : min;
  const clamped = Math.min(max, floor);
  const percent = ((clamped - min) / (max - min)) * 100;
  return {
    value: clamped,
    percent,
    isAboveRange: Number.isFinite(numeric) && numeric > max,
  };
}
