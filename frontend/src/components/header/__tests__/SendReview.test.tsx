// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendReview } from '@/components/header/SendReview';
import { SUPPORTED_CHAINS } from '@/lib/constants';

const FROM = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const TRANSFER = { to: '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23', raw: 12_500_000n } as const;

afterEach(cleanup);

function renderReview() {
  const onSend = vi.fn();
  const onEdit = vi.fn();
  render(<SendReview from={FROM} transfer={TRANSFER} network={SUPPORTED_CHAINS.arbitrumSepolia} onSend={onSend} onEdit={onEdit} />);
  return { onSend, onEdit };
}

describe('SendReview', () => {
  it('testSendReviewWritesTheAddressOutWholeWithTheAmountAndTheNetwork', () => {
    renderReview();

    expect(screen.getByText(TRANSFER.to)).toBeTruthy();
    expect(screen.getByText('12.5')).toBeTruthy();
    expect(screen.getByText('Arbitrum Sepolia')).toBeTruthy();
  });

  it('testSendReviewSendsOnlyFromItsButtonWhichNamesTheAmount', () => {
    const { onSend, onEdit } = renderReview();

    fireEvent.click(screen.getByRole('button', { name: 'Send 12.5 USDT' }));

    expect([onSend.mock.calls.length, onEdit.mock.calls.length]).toEqual([1, 0]);
  });

  it('testSendReviewGoesBackToTheFormToChangeIt', () => {
    const { onSend, onEdit } = renderReview();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));

    expect([onSend.mock.calls.length, onEdit.mock.calls.length]).toEqual([0, 1]);
  });
});
