// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StakeStepBody } from '@/components/duel/create/StakeStepBody';
import { translations } from '@/i18n/translations';
import type { BalanceStatus, FundingStatus } from '@/lib/balanceStatus';
import { readWager } from '@/lib/wagerInput';

afterEach(cleanup);

const en = translations.en;
const STOPS = [0.3, 3, 5, 10, 25, 50, 100, 500];

function body(stakeText: string, overrides: { isSignedIn?: boolean; balance?: BalanceStatus; funding?: FundingStatus } = {}) {
  const props = {
    onStakeText: vi.fn(),
    onContinue: vi.fn(),
    onTopUp: vi.fn(),
    onRetryBalance: vi.fn(),
    onRipple: vi.fn(),
  };
  render(
    <StakeStepBody
      stakeText={stakeText}
      reading={readWager(stakeText, 0.3)}
      minWager={0.3}
      stops={STOPS}
      isOpen
      isSignedIn={overrides.isSignedIn ?? false}
      balance={overrides.balance ?? { kind: 'no-wallet' }}
      funding={overrides.funding ?? { kind: 'unknown' }}
      {...props}
    />
  );
  return props;
}

const field = () => screen.getByRole('textbox', { name: en['create.stake.label'] });
const proceed = () => screen.getByRole('button', { name: en['create.step.continue'] }) as HTMLButtonElement;

describe('StakeStepBody', () => {
  it('keeps digits and one separator of what is typed', () => {
    const props = body('');

    fireEvent.change(field(), { target: { value: '4,2,1x' } });

    expect(props.onStakeText).toHaveBeenCalledWith('4,21');
  });

  it('goes on with a stake typed with a comma', () => {
    const props = body('4,2');

    fireEvent.keyDown(field(), { key: 'Enter' });

    expect(props.onContinue).toHaveBeenCalledOnce();
    expect(proceed().disabled).toBe(false);
  });

  it('refuses more decimals than USDT has', () => {
    body('4.1234567');

    expect(screen.getByText(en['create.decimals'])).toBeTruthy();
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(proceed().disabled).toBe(true);
  });

  it('refuses a stake under the minimum', () => {
    body('0.1');

    expect(screen.getByRole('alert').textContent).toBe(en['create.min'].replace('{min}', '0.3'));
  });

  it('sums the duel: the stake from each, twice that to the winner', () => {
    body('5');

    const chipOf = (key: 'create.math.you' | 'create.math.them' | 'create.math.winner') =>
      screen.getByText(en[key]).previousElementSibling?.textContent;
    expect([chipOf('create.math.you'), chipOf('create.math.them'), chipOf('create.math.winner')]).toEqual(['5', '5', '10']);
  });

  it('asks a visitor to sign in to see the wallet', () => {
    body('5');

    expect(screen.getByText(en['create.balance.signIn'])).toBeTruthy();
  });

  it('tops up a wallet short of the stake', () => {
    const props = body('50', { isSignedIn: true, balance: { kind: 'ready', raw: 46_700_000n }, funding: { kind: 'short', shortfallRaw: 3_300_000n } });

    fireEvent.click(screen.getByRole('button', { name: en['topup.action'] }));

    expect(screen.getByText(/3\.3/).textContent).toBe(en['topup.short'].replace('{amount}', '3.3'));
    expect(props.onTopUp).toHaveBeenCalledOnce();
  });

  it('says a wallet holds enough', () => {
    body('5', { isSignedIn: true, balance: { kind: 'ready', raw: 46_700_000n }, funding: { kind: 'enough' } });

    expect(screen.getByText(en['topup.enough'])).toBeTruthy();
  });

  it('writes a stake set on the slider into the field and bumps the planned stakes', () => {
    const props = body('5');

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

    expect(props.onStakeText).toHaveBeenCalledWith('10');
    expect(props.onRipple).toHaveBeenCalledOnce();
  });
});
