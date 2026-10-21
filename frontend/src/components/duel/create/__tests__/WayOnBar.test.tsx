// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WayOnBar } from '@/components/duel/create/WayOnBar';
import { translations } from '@/i18n/translations';
import type { WayOn } from '@/lib/createSetup';

afterEach(cleanup);

const en = translations.en;
const PARAMS = { min: '0.3', max: 32, amount: '3.3', wager: '5' };
/** Text as it is matched: Testing Library collapses a no-break space in the page to a plain one. */
const plain = (text: string) => text.replace(/\s/g, ' ');

function bar(way: WayOn) {
  const onGo = vi.fn();
  render(<WayOnBar way={way} params={PARAMS} place="panel" onGo={onGo} />);
  return onGo;
}

describe('WayOnBar', () => {
  it.each([
    ['game', 'create.bar.game'],
    ['stake', 'create.bar.stake'],
    ['message', 'create.bar.message'],
  ] as const)('says what is missing and waits while the %s is', (way, text) => {
    bar(way);

    expect(screen.getByText(plain(en[text].replace('{min}', '0.3').replace('{max}', '32')))).toBeTruthy();
    expect((screen.getByRole('button', { name: en['create.cta'] }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    ['signIn', 'nav.connectWallet'],
    ['short', 'topup.action'],
    ['ready', 'create.cta'],
  ] as const)('deals with %s', (way, label) => {
    const onGo = bar(way);

    fireEvent.click(screen.getByRole('button', { name: en[label] }));

    expect(onGo).toHaveBeenCalledWith(way);
  });

  it('names the stake that goes into the safe', () => {
    bar('ready');

    expect(screen.getByText(plain(en['create.bar.ready'].replace('{wager}', '5')))).toBeTruthy();
  });
});
