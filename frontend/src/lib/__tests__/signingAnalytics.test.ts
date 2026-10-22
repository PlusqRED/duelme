import { describe, expect, it } from 'vitest';
import type { SigningProps } from '@/lib/analytics';
import type { FlowError } from '@/lib/flowError';
import { signingEvents, type SigningSnapshot } from '@/lib/signingAnalytics';

const JOIN: SigningProps = { action: 'joinDuelWithPermit', chain_id: 421614, contract: '0xc0', route: 'relay', duel_id: 7, stake: '5' };
const CREATE: SigningProps = { action: 'createDuelWithPermit', chain_id: 421614, contract: '0xc0', route: 'relay', stake: '5' };

function snap(overrides: Partial<SigningSnapshot> = {}): SigningSnapshot {
  return { open: true, place: 'review', error: null, props: JOIN, ...overrides };
}

const rejected: FlowError = { kind: 'rejected', detail: 'User rejected the request.', canRetry: true };

describe('signingEvents', () => {
  it('reports a window as it opens, and only then', () => {
    expect(signingEvents(null, snap())).toEqual([{ name: 'signing_opened', props: JOIN }]);
    expect(signingEvents(snap(), snap({ place: 'write' }))).toEqual([]);
  });

  it('reports nothing for a window that stays shut', () => {
    expect(signingEvents(null, snap({ open: false }))).toEqual([]);
    expect(signingEvents(snap({ open: false }), snap({ open: false }))).toEqual([]);
  });

  it('reports an error once, where it happened, with whether another go can help', () => {
    const failing = snap({ place: 'write', error: rejected });

    expect(signingEvents(snap({ place: 'write' }), failing)).toEqual([
      {
        name: 'signing_failed',
        props: { ...JOIN, place: 'write', kind: 'rejected', retry: 1, detail: 'User rejected the request.' },
      },
    ]);
    expect(signingEvents(failing, snap({ place: 'write', error: rejected }))).toEqual([]);
  });

  it('reports another error after a retry as a new one', () => {
    const again: FlowError = { kind: 'reverted', detail: null, canRetry: false };

    const [event] = signingEvents(snap({ place: 'write', error: rejected }), snap({ place: 'write', error: again }));

    expect(event).toEqual({ name: 'signing_failed', props: { ...JOIN, place: 'write', kind: 'reverted', retry: 0, detail: undefined } });
  });

  it('cuts a long error to what fits in an event', () => {
    const dump: FlowError = { kind: 'error', detail: 'x'.repeat(5000), canRetry: true };

    const [event] = signingEvents(snap(), snap({ error: dump }));

    expect(event.name === 'signing_failed' && event.props.detail?.length).toBe(300);
  });

  it('reports Done once', () => {
    const done = snap({ place: 'success' });

    expect(signingEvents(snap({ place: 'write' }), done)).toEqual([{ name: 'signing_done', props: JOIN }]);
    expect(signingEvents(done, snap({ place: 'success' }))).toEqual([]);
    expect(signingEvents(done, snap({ open: false, place: 'success' }))).toEqual([]);
  });

  it('holds a create’s Done until its receipt names the duel', () => {
    const waiting = snap({ place: 'success', props: CREATE });
    const named = snap({ place: 'success', props: { ...CREATE, duel_id: 12 } });

    expect(signingEvents(snap({ place: 'write', props: CREATE }), waiting)).toEqual([]);
    expect(signingEvents(waiting, named)).toEqual([{ name: 'signing_done', props: { ...CREATE, duel_id: 12 } }]);
  });

  it('still reports a create closed on Done before its duel was named', () => {
    const waiting = snap({ place: 'success', props: CREATE });

    expect(signingEvents(waiting, snap({ open: false, place: 'success', props: CREATE }))).toEqual([
      { name: 'signing_done', props: CREATE },
    ]);
  });

  it('reports a window closed before Done as left, from where it stood', () => {
    expect(signingEvents(snap({ place: 'switch-network' }), snap({ open: false }))).toEqual([
      { name: 'signing_abandoned', props: { ...JOIN, place: 'switch-network' } },
    ]);
  });
});
