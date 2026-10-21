import { describe, expect, it } from 'vitest';
import { brandColors } from '@/lib/brandColors';
import { OWN_SEAT_CURSOR } from '@/lib/seatCursor';

function image(cursor: string): string {
  const encoded = cursor.match(/^url\("data:image\/svg\+xml,([^"]+)"\)/)?.[1];
  return encoded ? decodeURIComponent(encoded) : '';
}

describe('OWN_SEAT_CURSOR', () => {
  it('testOwnSeatCursorIsANoEntrySignInTheCreatorsRed', () => {
    expect(image(OWN_SEAT_CURSOR)).toContain(`fill='${brandColors.red}'`);
  });

  it('testOwnSeatCursorPointsFromTheSignsCentre', () => {
    expect(OWN_SEAT_CURSOR).toMatch(/"\) 14 14, /);
  });

  it('testOwnSeatCursorFallsBackToNotAllowed', () => {
    expect(OWN_SEAT_CURSOR.endsWith(', not-allowed')).toBe(true);
  });
});
