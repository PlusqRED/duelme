import { describe, expect, it } from 'vitest';
import { getFundingRoute } from '@/lib/guidedFlowSteps';

describe('getFundingRoute', () => {
  it('funds the stake with a permit when the write is relayed', () => {
    expect(getFundingRoute({ isRelayResolved: true, isRelayEnabled: true })).toBe('permit');
  });

  it('funds the stake from an allowance when the player pays the gas', () => {
    expect(getFundingRoute({ isRelayResolved: true, isRelayEnabled: false })).toBe('allowance');
  });

  it('knows neither while the relay probe has not answered', () => {
    expect(getFundingRoute({ isRelayResolved: false, isRelayEnabled: false })).toBe('unknown');
  });
});
