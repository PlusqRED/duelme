// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES, USDT_ADDRESSES } from '@/lib/constants';
import type { PermitSignature } from '@/lib/permitSignature';

const SECRET = `0x${'5'.repeat(64)}` as const;
const PERMIT: PermitSignature = { deadline: 99n, v: 27, r: `0x${'1'.repeat(64)}`, s: `0x${'2'.repeat(64)}` };

const write = vi.hoisted(() => ({
  isRelayEnabled: true,
  writeWithGas: vi.fn(async () => undefined),
  relayWrite: vi.fn(async () => undefined),
  reset: vi.fn(),
  permit: { resolve: ((signature: PermitSignature) => void signature) as (signature: PermitSignature) => void },
}));

vi.mock('@/hooks/useWriteWithGas', () => ({
  useWriteWithGas: () => ({
    writeWithGas: write.writeWithGas,
    relayWrite: write.relayWrite,
    isRelayEnabled: write.isRelayEnabled,
    reset: write.reset,
    hash: undefined,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    receipt: undefined,
    error: null,
  }),
}));
vi.mock('@/hooks/useDuelPermit', () => ({
  useDuelPermit: () => () =>
    new Promise<PermitSignature>((resolve) => {
      write.permit.resolve = resolve;
    }),
}));

const { useDuelActions } = await import('@/hooks/useDuelActions');

beforeEach(() => {
  write.isRelayEnabled = true;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function render() {
  return renderHook(() => useDuelActions(DEFAULT_CHAIN_ID));
}

describe('useDuelActions — relayed', () => {
  it('testJoinDuelAsksForThePermitFirst', async () => {
    const { result } = render();

    act(() => void result.current.joinDuel(7n, SECRET, 100n));

    expect(result.current.signingPhase).toBe('permit');
    expect(write.relayWrite).not.toHaveBeenCalled();
  });

  it('testJoinDuelSendsThePermitInsideTheRequestOnceSigned', async () => {
    const { result } = render();
    act(() => void result.current.joinDuel(7n, SECRET, 100n));

    await act(async () => write.permit.resolve(PERMIT));

    expect(result.current.signingPhase).toBe('request');
    expect(write.relayWrite).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'joinDuelWithPermit', args: [7n, SECRET, 99n, 27, PERMIT.r, PERMIT.s] })
    );
  });

  it('testAMoveAsksForOneRequestSignature', async () => {
    const { result } = render();

    await act(async () => result.current.claimVictory(3n));

    expect(result.current.signingPhase).toBe('request');
    expect(write.relayWrite).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'claimVictory', args: [3n] }));
  });

  it('testAnApproveStaysSelfPaidWhileRelayingIsOn', async () => {
    const { result } = render();

    await act(async () => result.current.approveToken(USDT_ADDRESSES[DEFAULT_CHAIN_ID], 100n));

    expect(write.writeWithGas).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'approve', args: [DUELME_ADDRESSES[DEFAULT_CHAIN_ID], 100n] }),
      120_000n
    );
    expect(result.current.signingPhase).toBeNull();
  });

  it('testResetForgetsThePhase', async () => {
    const { result } = render();
    await act(async () => result.current.claimVictory(3n));

    act(() => result.current.reset());

    expect(result.current.signingPhase).toBeNull();
    expect(write.reset).toHaveBeenCalledOnce();
  });
});

describe('useDuelActions — self-paid', () => {
  it('testJoinDuelSendsThePlainCallFromTheWallet', async () => {
    write.isRelayEnabled = false;
    const { result } = render();

    await act(async () => result.current.joinDuel(7n, SECRET, 100n));

    expect(write.relayWrite).not.toHaveBeenCalled();
    expect(write.writeWithGas).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'joinDuel', args: [7n, SECRET] }), undefined);
    expect(result.current.signingPhase).toBeNull();
  });

  it('testCreateDuelLeavesAnEmptyMessageOut', async () => {
    write.isRelayEnabled = false;
    const { result } = render();

    await act(async () => result.current.createDuel(5n, SECRET));

    expect(write.writeWithGas).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'createDuel', args: [5n, SECRET] }), 400_000n);
  });
});
