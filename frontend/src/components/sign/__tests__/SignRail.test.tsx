// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SignRail } from '@/components/sign/SignRail';

afterEach(cleanup);

function renderRail() {
  return render(
    <SignRail
      steps={[
        { step: 'check', status: 'done' },
        { step: 'sign', status: 'current' },
        { step: 'send', status: 'next' },
        { step: 'done', status: 'next' },
      ]}
    />
  );
}

describe('SignRail', () => {
  it('testSignRailNamesEveryStepInOrder', () => {
    renderRail();

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Check', 'Sign', 'Send', 'Done']);
  });

  it('testSignRailMarksTheStepUnderWay', () => {
    renderRail();

    const current = screen.getAllByRole('listitem').filter((item) => item.getAttribute('aria-current') === 'step');
    expect(current.map((item) => item.textContent)).toEqual(['Sign']);
  });

  it('testSignRailColoursAStopOrange', () => {
    render(<SignRail steps={[{ step: 'check', status: 'done' }, { step: 'send', status: 'error' }]} />);

    expect(screen.getByText('Send').parentElement?.dataset.status).toBe('error');
  });
});
