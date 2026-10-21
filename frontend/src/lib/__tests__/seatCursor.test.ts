import { describe, expect, it } from 'vitest';
import { brandColors } from '@/lib/brandColors';
import { OWN_SEAT_CURSOR } from '@/lib/seatCursor';

function image(cursor: string): string {
  const encoded = cursor.match(/^url\("data:image\/svg\+xml,([^"]+)"\)/)?.[1];
  return encoded ? decodeURIComponent(encoded) : '';
}

describe('OWN_SEAT_CURSOR', () => {
  it('is a no-entry sign in the creator’s red', () => {
    expect(image(OWN_SEAT_CURSOR)).toContain(`fill='${brandColors.red}'`);
  });

  it('points from the sign’s centre', () => {
    expect(OWN_SEAT_CURSOR).toMatch(/"\) 14 14, /);
  });

  it('falls back to not-allowed', () => {
    expect(OWN_SEAT_CURSOR.endsWith(', not-allowed')).toBe(true);
  });
});
