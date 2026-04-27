import { describe, it, expect } from 'vitest';
import { generateIdenticon } from '../identicon';

describe('generateIdenticon', () => {
  it('returns an SVG data URL', () => {
    const out = generateIdenticon('0xabc1234567890123456789012345678901234567');
    expect(out).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it('is deterministic — same input yields same output', () => {
    const a = generateIdenticon('0xabc1234567890123456789012345678901234567');
    const b = generateIdenticon('0xabc1234567890123456789012345678901234567');
    expect(a).toBe(b);
  });

  it('different inputs yield different output', () => {
    const a = generateIdenticon('0xaaa1234567890123456789012345678901234567');
    const b = generateIdenticon('0xbbb1234567890123456789012345678901234567');
    expect(a).not.toBe(b);
  });

  it('is case-insensitive on the address', () => {
    const lower = generateIdenticon('0xabcdef1234567890123456789012345678901234');
    const upper = generateIdenticon('0xABCDEF1234567890123456789012345678901234');
    expect(lower).toBe(upper);
  });

  it('returns a 5×5 mirrored grid encoded as path commands', () => {
    const out = generateIdenticon('0xabc1234567890123456789012345678901234567');
    expect(out).toContain('viewBox=\'0 0 5 5\'');
  });
});
