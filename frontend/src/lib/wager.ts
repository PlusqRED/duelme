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
