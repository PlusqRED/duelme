// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SetupStep } from '@/components/duel/create/SetupStep';
import { translations } from '@/i18n/translations';
import type { StepStatus } from '@/lib/createSetup';

afterEach(cleanup);

const en = translations.en;

function step(status: StepStatus, overrides: Partial<Parameters<typeof SetupStep>[0]> = {}) {
  const onOpen = vi.fn();
  const view = render(
    <ol>
      <SetupStep number={2} label="Stake" status={status} value="5 USDT each" focusTurn={0} bodyId="body" onOpen={onOpen} {...overrides}>
        <input aria-label="Amount" data-first />
      </SetupStep>
    </ol>
  );
  return { onOpen, ...view };
}

describe('SetupStep', () => {
  it('shows the open step’s body, not its answer', () => {
    step('current');

    expect(screen.getByRole('button', { name: /Stake/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('Amount')).toBeTruthy();
    expect(screen.queryByText('5 USDT each')).toBeNull();
  });

  it('closes on its answer with a way to change it', () => {
    const { onOpen } = step('done');

    fireEvent.click(screen.getByRole('button', { name: /Stake/ }));

    expect(screen.getByText('5 USDT each')).toBeTruthy();
    expect(screen.getByText(en['create.step.change'])).toBeTruthy();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('cannot be opened while a step above it waits', () => {
    step('locked');

    expect((screen.getByRole('button', { name: /Stake/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(en['create.step.change'])).toBeNull();
  });

  it('says what is optional until it is answered', () => {
    step('ahead', { aside: 'optional', value: null });

    expect(screen.getByText('optional')).toBeTruthy();
  });

  it('gives its first control the focus when the player opens it', () => {
    const { rerender, onOpen } = step('done');

    rerender(
      <ol>
        <SetupStep number={2} label="Stake" status="current" value={null} focusTurn={1} bodyId="body" onOpen={onOpen}>
          <input aria-label="Amount" data-first />
        </SetupStep>
      </ol>
    );

    expect(document.activeElement).toBe(screen.getByLabelText('Amount'));
  });

  it('leaves the focus alone when the page opens it', () => {
    step('current');

    expect(document.activeElement).toBe(document.body);
  });
});
