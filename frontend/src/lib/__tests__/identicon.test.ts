import { describe, expect, it } from 'vitest';
import { identiconCells } from '@/lib/identicon';

const ADDRESS = '0x1111111111111111111111111111111111111111';

function keys(address: string) {
  return identiconCells(address).map(({ x, y }) => `${x},${y}`);
}

describe('identiconCells', () => {
  it('draws the pattern the design draws for an address', () => {
    expect(keys(ADDRESS)).toEqual([
      '0,0', '4,0', '2,0', '0,1', '4,1', '1,1', '3,1', '0,2', '4,2', '1,2', '3,2', '2,2',
      '1,3', '3,3', '0,4', '4,4', '1,4', '3,4',
    ]);
  });

  it('draws the same pattern for an address in any letter case', () => {
    const address = '0xAbCdEf0123456789abcdef0123456789ABCDEF01';

    expect(keys(address)).toEqual(keys(address.toLowerCase()));
  });

  it('mirrors every cell around the middle column', () => {
    const cells = new Set(keys('0xAbCdEf0123456789abcdef0123456789ABCDEF01'));

    expect([...cells].every((cell) => {
      const [x, y] = cell.split(',').map(Number);
      return cells.has(`${4 - x},${y}`);
    })).toBe(true);
  });

  it('draws different addresses differently', () => {
    expect(keys(ADDRESS)).not.toEqual(keys('0x2222222222222222222222222222222222222222'));
  });

  it('fills a few more squares for an address whose pattern would be blank', () => {
    const sources = identiconCells('0x0e681fd6c3eb7c3bc21614b378dfb01696ef2371').filter(({ x }) => x < 3);

    expect(sources.length).toBeGreaterThanOrEqual(3);
  });

  it('stays inside the 5×5 grid', () => {
    expect(identiconCells(ADDRESS).every(({ x, y }) => x >= 0 && x < 5 && y >= 0 && y < 5)).toBe(true);
  });
});
