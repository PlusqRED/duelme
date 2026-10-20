// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NeedsList } from '@/components/sign/NeedsList';
import { translations } from '@/i18n/translations';
import type { BalanceStatus } from '@/lib/balanceStatus';

afterEach(cleanup);

const en = translations.en;
const STAKE = 25_000_000n;

function needs(balance: BalanceStatus) {
  return render(<NeedsList usdt={{ needRaw: STAKE, balance, side: 'opponent' }} />);
}

/** The line as Testing Library reads it, its non-breaking spaces plain. */
function text(key: keyof typeof en, token: string, value: string) {
  return en[key].replace(`{${token}}`, value).replace(/\u00a0/g, ' ');
}

describe('NeedsList', () => {
  it('names the stake that leaves the wallet and what the wallet holds', () => {
    needs({ kind: 'ready', raw: 30_000_000n });

    expect(screen.getByText(text('sign.need.usdt', 'wager', '25'))).toBeTruthy();
    expect(screen.getByText(text('sign.need.usdt.have', 'have', '30'))).toBeTruthy();
  });

  it('says Enough for a wallet that covers the stake', () => {
    needs({ kind: 'ready', raw: 30_000_000n });

    expect(screen.getByText(en['sign.need.enough'])).toBeTruthy();
  });

  it('says how much is short, in orange', () => {
    needs({ kind: 'ready', raw: 5_000_000n });

    expect(screen.getByText(text('topup.short', 'amount', '20'))).toBeTruthy();
    expect(screen.getByRole('listitem').dataset.tone).toBe('short');
  });

  it('judges nothing while the balance is being read', () => {
    needs({ kind: 'checking' });

    expect(screen.getByText(text('sign.need.usdt.have', 'have', '…'))).toBeTruthy();
    expect(screen.getByRole('listitem').dataset.tone).toBeUndefined();
  });

  it('shows a dash for a balance that could not be read', () => {
    needs({ kind: 'error' });

    expect(screen.getByText(text('sign.need.usdt.have', 'have', '—'))).toBeTruthy();
  });
});
