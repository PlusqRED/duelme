/** A filled square of an identicon's 5×5 grid. */
export interface IdenticonCell {
  x: number;
  y: number;
}

const SIZE = 5;
const DRAWN_COLUMNS = 3;
const DRAWN_BITS = SIZE * DRAWN_COLUMNS;
const DRAWN_MASK = (1 << DRAWN_BITS) - 1;
/** Fewer filled cells on the drawn side than this hardly tell one face from another. */
const FEWEST_SQUARES = 3;

/** FNV-1a, 32 bits: the same text always gives the same number. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function countBits(bits: number): number {
  let count = 0;
  for (let rest = bits; rest; rest &= rest - 1) count += 1;
  return count;
}

/**
 * A player's pattern, drawn from their address: 15 bits of its hash fill the left three columns
 * of a 5×5 grid, and the right two mirror them; a hash whose 15 bits fill fewer than three squares
 * adds its next 15, which still leaves too few for about one address in a million. An address in
 * any letter case draws the same one.
 */
export function identiconCells(address: string): IdenticonCell[] {
  const hash = fnv1a(address.trim().toLowerCase());
  const first = hash & DRAWN_MASK;
  const bits = countBits(first) >= FEWEST_SQUARES ? first : first | ((hash >>> DRAWN_BITS) & DRAWN_MASK);
  const cells: IdenticonCell[] = [];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < DRAWN_COLUMNS; x += 1) {
      if (!((bits >>> (y * DRAWN_COLUMNS + x)) & 1)) continue;
      const mirrored = SIZE - 1 - x;
      cells.push({ x, y });
      if (mirrored !== x) cells.push({ x: mirrored, y });
    }
  }

  return cells;
}
