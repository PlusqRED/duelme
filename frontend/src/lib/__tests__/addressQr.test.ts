import { describe, expect, it } from 'vitest';
import { create } from 'qrcode';
import { buildQrPath } from '../addressQr';

const ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';

/** Paints the path back onto a grid, to compare it with the symbol module by module. */
function rasterize(path: string, size: number): boolean[][] {
  const grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const commands = [...path.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)];
  expect(commands.map((match) => match[0]).join('')).toBe(path);

  for (const [, x, y, width, back] of commands) {
    expect(back).toBe(width);
    for (let col = Number(x); col < Number(x) + Number(width); col++) {
      expect(grid[Number(y)][col]).toBe(false);
      grid[Number(y)][col] = true;
    }
  }
  return grid;
}

function encodedText(text: string): string {
  return create(text, { errorCorrectionLevel: 'M' })
    .segments.map((segment) =>
      typeof segment.data === 'string' ? segment.data : new TextDecoder().decode(segment.data)
    )
    .join('');
}

describe('buildQrPath', () => {
  it('draws exactly the dark modules of the symbol for the address', () => {
    const { modules } = create(ADDRESS, { errorCorrectionLevel: 'M' });
    const { size, path } = buildQrPath(ADDRESS);

    expect(size).toBe(modules.size);
    const grid = rasterize(path, size);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        expect(grid[row][col]).toBe(modules.get(row, col) === 1);
      }
    }
  });

  it('carries the bare address as its whole payload — no URI scheme, amount or token', () => {
    // The first test pins the drawn symbol to create(ADDRESS); this pins that symbol's payload.
    expect(encodedText(ADDRESS)).toBe(ADDRESS);
  });

  it('gives a different symbol for a different address', () => {
    const other = '0x1234567890AbcdEF1234567890aBcdef12345679';

    expect(buildQrPath(other).path).not.toBe(buildQrPath(ADDRESS).path);
  });
});
