import { vi } from 'vitest';
import type { SigningModel } from '@/components/sign/signingModel';
import { signItems } from '@/components/sign/signItems';
import type { FlowFunding } from '@/hooks/useFlowFunding';
import { translator } from '@/i18n/translate';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { ACTION_COPY } from '@/lib/signingCopy';
import { signPlan } from '@/lib/signPlan';
import type { WriteRoute } from '@/lib/writeRoute';

/**
 * Signing-window models for component tests, worded as the join window words them.
 *
 * Not named `*.test.ts`, so vitest's `include` glob does not collect it.
 */

export const { t } = translator('en');

/** Matches copy only with its non-breaking spaces where they belong. */
export const exactly = { normalizer: (text: string) => text };

const PARAMS = { id: 3, wager: '5', pot: '10', other: 'Nova', network: DEFAULT_CHAIN.name, amount: '10' };

export function funding(overrides: Partial<FlowFunding> = {}): FlowFunding {
  return {
    balance: { kind: 'ready', raw: 12_000_000n },
    status: { kind: 'enough' },
    isTopUpOpen: false,
    retry: vi.fn(),
    openTopUp: vi.fn(),
    closeTopUp: vi.fn(),
    ...overrides,
  };
}

/** Joining duel #3 for 5 USDT: a permit then the join when relayed, an approve then the join when not. */
export function joinModel(overrides: Partial<SigningModel> = {}, route: WriteRoute = 'relay'): SigningModel {
  const copy = ACTION_COPY.join;
  const plan = signPlan({ route, funds: true, needsApproval: route === 'self' });
  return {
    open: true,
    canClose: true,
    copy,
    title: t(copy.title, PARAMS),
    sub: DEFAULT_CHAIN.name,
    caption: t(copy.caption, PARAMS),
    button: t(copy.button, PARAMS),
    doneTitle: t(copy.doneTitle, PARAMS),
    doneText: t(copy.doneText, PARAMS),
    doneButton: t(copy.back),
    backLabel: t(copy.back),
    slowText: t('sign.slow.text'),
    route,
    items: signItems({ plan, route, move: t(copy.move, PARAMS), moveGas: 'join', wager: '5', t }),
    place: 'review',
    actionState: 'idle',
    error: null,
    signing: { phase: null, hash: undefined, failedWhile: null, feePaidWei: 0n, createdDuelId: null },
    showNetwork: false,
    approved: false,
    chainId: DEFAULT_CHAIN.id,
    chainName: DEFAULT_CHAIN.name,
    duelId: 3,
    wager: '5',
    stake: { funding: funding(), needRaw: 5_000_000n, isJoining: true },
    blockedReason: null,
    canContinue: true,
    facts: { contract: DEFAULT_CHAIN.duelMe, functionName: 'joinDuelWithPermit', token: DEFAULT_CHAIN.usdt, allowance: '5' },
    onContinue: vi.fn(),
    run: { 'switch-network': vi.fn(), approve: vi.fn(), write: vi.fn() },
    onClose: vi.fn(),
    onDone: vi.fn(),
    ...overrides,
  };
}

/** The same join with 2 USDT in the wallet: 3 USDT short. */
export function shortModel(overrides: Partial<FlowFunding> = {}) {
  const stake = {
    funding: funding({ balance: { kind: 'ready', raw: 2_000_000n }, status: { kind: 'short', shortfallRaw: 3_000_000n }, ...overrides }),
    needRaw: 5_000_000n,
    isJoining: true,
  };
  return { ...joinModel({ canContinue: false }), stake };
}
