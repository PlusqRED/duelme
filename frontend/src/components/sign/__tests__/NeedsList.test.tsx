// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChargeCells } from '@/components/sign/ChargeCells';
import { NeedsList } from '@/components/sign/NeedsList';

afterEach(cleanup);

/** Matches an amount only with no line break allowed before its unit. */
const exactly = { normalizer: (text: string) => text };

function rows(container: HTMLElement) {
  return [...container.querySelectorAll('li')];
}

describe('NeedsList', () => {
  it('testNeedsListSaysAWalletWithTheStakeHasEnough', () => {
    const { container } = render(<NeedsList usdt={{ needRaw: 14_000_000n, balance: { kind: 'ready', raw: 46_700_000n }, side: 'opponent' }} />);

    expect(screen.getByText('14\u00a0USDT from your wallet', exactly)).toBeTruthy();
    expect(screen.getByText('It holds 46.7\u00a0USDT', exactly)).toBeTruthy();
    expect(screen.getByText('Enough')).toBeTruthy();
    expect(rows(container)[0].dataset.tone).toBe('enough');
  });

  it('testNeedsListSaysHowMuchAShortWalletLacks', () => {
    const { container } = render(<NeedsList usdt={{ needRaw: 5_000_000n, balance: { kind: 'ready', raw: 2_000_000n }, side: 'creator' }} />);

    expect(screen.getByText('3 USDT short')).toBeTruthy();
    expect(rows(container)[0].dataset.tone).toBe('short');
  });

  it('testNeedsListGivesNoVerdictWhileTheBalanceIsRead', () => {
    const { container } = render(<NeedsList usdt={{ needRaw: 5_000_000n, balance: { kind: 'checking' }, side: 'creator' }} />);

    expect(screen.getByText('It holds …\u00a0USDT', exactly)).toBeTruthy();
    expect(screen.queryByText('Enough')).toBeNull();
    expect(rows(container)[0].dataset.tone).toBe('checking');
  });

  it('testNeedsListShowsTheEthAWalletMustHoldForItsFees', () => {
    render(<NeedsList eth={{ needWei: 13_400_000_000_000n, balance: { kind: 'ready', raw: 7_736_000_000_000_000n } }} />);

    expect(screen.getByText('Network fee: up to\u00a00.00002\u00a0ETH', exactly)).toBeTruthy();
    expect(screen.getByText('It holds 0.007736 ETH')).toBeTruthy();
    expect(screen.getByText('Enough')).toBeTruthy();
  });

  it('testNeedsListSaysAWalletLacksEthForItsFees', () => {
    render(<NeedsList eth={{ needWei: 13_400_000_000_000n, balance: { kind: 'ready', raw: 0n } }} />);

    expect(screen.getByText('Not enough ETH yet')).toBeTruthy();
  });

  it('testNeedsListShowsTheFaucetsWordsWhileItFillsTheWallet', () => {
    const { container } = render(
      <NeedsList eth={{ needWei: 13_400_000_000_000n, balance: { kind: 'ready', raw: 0n }, faucet: { level: 'filling', note: 'Asking the faucet…' } }} />
    );

    expect(screen.getByText('Asking the faucet…')).toBeTruthy();
    expect(screen.queryByText('Not enough ETH yet')).toBeNull();
    expect(rows(container)[0].dataset.phase).toBe('filling');
  });

  it('testNeedsListListsOnlyTheRowsItIsGiven', () => {
    const { container } = render(<NeedsList />);

    expect(rows(container)).toHaveLength(0);
  });
});

describe('ChargeCells', () => {
  function fills(container: HTMLElement) {
    return [...container.querySelectorAll('i')].map((cell) => cell.dataset.fill);
  }

  it('testChargeCellsLightWhatTheWalletCovers', () => {
    const { container } = render(<ChargeCells haveRaw={4_500_000n} needRaw={10_000_000n} side="opponent" />);

    expect(fills(container)).toEqual(['lit', 'lit', 'lit', 'lit', 'part', 'short', 'short', 'short', 'short', 'short']);
  });

  it('testChargeCellsChargeOnlyTheCellsNewMoneyCovers', () => {
    const { container } = render(<ChargeCells haveRaw={10_000_000n} needRaw={10_000_000n} side="creator" fromRaw={8_000_000n} />);

    const charging = [...container.querySelectorAll('i')].filter((cell) => cell.classList.contains('animate-cell-charge'));
    expect(charging).toHaveLength(2);
  });

  it('testChargeCellsStayHiddenFromScreenReaders', () => {
    const { container } = render(<ChargeCells haveRaw={1n} needRaw={10n} side="creator" />);

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
