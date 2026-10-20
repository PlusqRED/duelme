// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DuelSteps } from '@/components/duel/room/DuelSteps';
import { translations } from '@/i18n/translations';
import type { DuelStep } from '@/lib/duelPhase';

afterEach(cleanup);

const en = translations.en;

const waitingToJoin: DuelStep[] = [
  { kind: 'done', label: 'sim.step.1' },
  { kind: 'current', label: 'sim.step.2', mode: 'waiting' },
  { kind: 'todo', label: 'sim.step.3' },
  { kind: 'todo', label: 'sim.step.4' },
  { kind: 'todo', label: 'sim.step.5' },
];

const cancelled: DuelStep[] = [
  { kind: 'done', label: 'sim.step.1' },
  { kind: 'skipped', label: 'sim.step.2' },
  { kind: 'skipped', label: 'sim.step.3' },
  { kind: 'skipped', label: 'sim.step.4' },
  { kind: 'end', label: 'room.step.cancelled', tone: 'back' },
];

const answering: DuelStep[] = [
  { kind: 'done', label: 'sim.step.1' },
  { kind: 'done', label: 'sim.step.2' },
  { kind: 'done', label: 'sim.step.3' },
  { kind: 'current', label: 'sim.step.4', mode: 'timed' },
  { kind: 'todo', label: 'sim.step.5' },
];

function steps() {
  return within(screen.getByRole('list', { name: en['room.stepsLabel'] })).getAllByRole('listitem');
}

describe('DuelSteps', () => {
  it('names the five steps in order', () => {
    render(<DuelSteps steps={waitingToJoin} timeUsed={0} />);

    expect(steps().map((step) => step.querySelector('span')?.textContent)).toEqual([
      en['sim.step.1'],
      en['sim.step.2'],
      en['sim.step.3'],
      en['sim.step.4'],
      en['sim.step.5'],
    ]);
  });

  it('tells a screen reader which step the duel is on', () => {
    render(<DuelSteps steps={waitingToJoin} timeUsed={0} />);

    expect(steps().map((step) => step.getAttribute('aria-current'))).toEqual([null, 'step', null, null, null]);
  });

  it('strikes through the steps a duel never reached and names its ending', () => {
    render(<DuelSteps steps={cancelled} timeUsed={0} />);

    expect(steps()[1].querySelector('span')?.className).toContain('line-through');
    expect(steps()[4].textContent).toContain(en['room.step.cancelled']);
  });

  it('fills the timed step’s bar with the time to answer used up', () => {
    render(<DuelSteps steps={answering} timeUsed={0.25} />);

    expect(steps()[3].querySelector<HTMLElement>('i i')?.style.scale).toBe('0.25 1');
  });

  it('pops a step only when it moves on while the page is open', () => {
    const { rerender } = render(<DuelSteps steps={waitingToJoin} timeUsed={0} />);
    expect(document.querySelectorAll('.animate-pop')).toHaveLength(0);

    rerender(<DuelSteps steps={cancelled} timeUsed={0} />);

    const popped = steps().map((step) => step.querySelector('b')?.classList.contains('animate-pop'));
    expect(popped).toEqual([false, true, true, true, true]);
  });
});
