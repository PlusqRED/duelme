import { describe, expect, it } from 'vitest';
import { signItems } from '@/components/sign/signItems';
import { translator } from '@/i18n/translate';
import { signPlan } from '@/lib/signPlan';

const { t } = translator('en');

describe('signItems', () => {
  it('testSignItemsWordThePermitBeforeTheMoveOnTheRelay', () => {
    const items = signItems({
      plan: signPlan({ route: 'relay', funds: true, needsApproval: false }),
      route: 'relay',
      move: 'Join duel #7 against 0x1234…5678',
      moveGas: 'join',
      wager: '5',
      t,
    });

    expect(items.map((item) => item.text)).toEqual(['Allow 5 USDT for this duel', 'Join duel #7 against 0x1234…5678']);
    expect(items[1].sub).toBe(t('sign.move.sub'));
  });

  it('testSignItemsPutTheApproveOnItsOwnGasRow', () => {
    const items = signItems({
      plan: signPlan({ route: 'self', funds: true, needsApproval: true }),
      route: 'self',
      move: 'Create a duel',
      moveGas: 'create',
      wager: '5',
      t,
    });

    expect(items.map((item) => item.gas)).toEqual(['approve', 'create']);
    expect(items[1].sub).toBe(t('sign.move.sub.self'));
  });
});
