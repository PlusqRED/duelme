// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WalletPlace } from '@/components/sign/signingModel';
import { useSigningPress } from '@/hooks/useSigningPress';
import type { FlowActionState } from '@/lib/flowSession';
import type { FlowPlace } from '@/lib/signingSteps';

afterEach(cleanup);

interface Where {
  place: FlowPlace | null;
  actionState: FlowActionState;
}

function renderPress(initial: Where = { place: 'review', actionState: 'idle' }) {
  const run: Record<WalletPlace, () => void> = { 'switch-network': vi.fn(), approve: vi.fn(), write: vi.fn() };
  const hook = renderHook((where: Where) => useSigningPress({ ...where, run }), { initialProps: initial });
  return { ...hook, run };
}

describe('useSigningPress', () => {
  it('testUseSigningPressStartsEachStepThePressReaches', () => {
    const { result, rerender, run } = renderPress();

    act(() => result.current.press());
    rerender({ place: 'approve', actionState: 'idle' });
    rerender({ place: 'write', actionState: 'idle' });

    expect(run.approve).toHaveBeenCalledOnce();
    expect(run.write).toHaveBeenCalledOnce();
  });

  it('testUseSigningPressStartsNothingWithoutAPress', () => {
    const { rerender, run } = renderPress();

    rerender({ place: 'write', actionState: 'idle' });

    expect(run.write).not.toHaveBeenCalled();
  });

  it('testUseSigningPressAsksForAStepOncePerPress', () => {
    const { result, rerender, run } = renderPress();

    act(() => result.current.press());
    rerender({ place: 'switch-network', actionState: 'idle' });
    rerender({ place: 'switch-network', actionState: 'awaiting-wallet' });
    rerender({ place: 'switch-network', actionState: 'idle' });

    expect(run['switch-network']).toHaveBeenCalledOnce();
  });

  it('testUseSigningPressEndsAtAStop', () => {
    const { result, rerender, run } = renderPress();

    act(() => result.current.press());
    rerender({ place: 'approve', actionState: 'error' });
    rerender({ place: 'write', actionState: 'idle' });

    expect(run.write).not.toHaveBeenCalled();
  });

  it('testUseSigningPressLeavesTheStepItsCallerStarted', () => {
    const { result, rerender, run } = renderPress({ place: 'write', actionState: 'error' });

    act(() => result.current.press('write'));
    rerender({ place: 'write', actionState: 'idle' });

    expect(run.write).not.toHaveBeenCalled();
  });

  it('testUseSigningPressEndsWhenTheWindowCloses', () => {
    const { result, rerender, run } = renderPress();

    act(() => result.current.press());
    rerender({ place: null, actionState: 'idle' });
    rerender({ place: 'write', actionState: 'idle' });

    expect(run.write).not.toHaveBeenCalled();
  });
});
