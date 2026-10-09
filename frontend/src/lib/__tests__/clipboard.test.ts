import { describe, expect, it, vi } from 'vitest';
import { copyText } from '../clipboard';

const ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';

describe('copyText', () => {
  it('reports success only after writeText resolves, with the exact text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(copyText(ADDRESS, { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(ADDRESS);
  });

  it('reports failure when the browser refuses the write', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));

    await expect(copyText(ADDRESS, { writeText })).resolves.toBe(false);
  });

  it('reports failure when there is no clipboard API at all', async () => {
    await expect(copyText(ADDRESS, undefined)).resolves.toBe(false);
  });
});
