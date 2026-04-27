/**
 * Deterministic 5×5 mirrored pixel-art identicon from a wallet address.
 * Inspired by GitHub's identicon: hash → split → mirror horizontally → SVG.
 *
 * Hand-rolled so we avoid the @dicebear runtime dependency.
 */

const PALETTE = [
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#ef4444', // red-500
  '#f97316', // orange-500
];

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function pickColor(hash: number): string {
  return PALETTE[hash % PALETTE.length];
}

export function generateIdenticon(walletAddress: string): string {
  const seed = walletAddress.toLowerCase();
  const baseHash = fnv1a(seed);
  const color = pickColor(baseHash);

  const bitsHash = fnv1a(seed + ':bits');
  const combined = baseHash ^ (bitsHash * 0x9e3779b1);

  const cells: boolean[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const bitIndex = row * 3 + col;
      const filled = ((combined >>> bitIndex) & 1) === 1;
      cells.push(filled);
    }
  }

  let path = '';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (cells[row * 3 + col]) {
        path += `M${col} ${row}h1v1h-1z`;
        if (col < 2) {
          const mirroredCol = 4 - col;
          path += `M${mirroredCol} ${row}h1v1h-1z`;
        }
      }
    }
  }

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 5 5' shape-rendering='crispEdges'>` +
    `<rect width='5' height='5' fill='#f1f5f9'/>` +
    `<path d='${path}' fill='${color}'/>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${svg.replace(/#/g, '%23')}`;
}
