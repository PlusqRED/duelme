// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { QuestLine } from '@/components/identity/QuestLine';
import { levelQuest } from '@/lib/reputation';

/** Four honored duels and no abandoned one: one more to Reliable. */
const QUEST = levelQuest(4, 0);

function litCells() {
  return screen.getByRole('img').querySelectorAll('.inset-shadow-avatar');
}

afterEach(cleanup);

describe('QuestLine', () => {
  it('reads out how far the next level is', () => {
    render(<QuestLine quest={QUEST} />);

    expect(screen.getByRole('img', { name: 'To Reliable: 4 of 5 honored' })).toBeTruthy();
  });

  it('lights a cell for each honored duel done', () => {
    render(<QuestLine quest={QUEST} />);

    expect(litCells()).toHaveLength(4);
  });

  it('keeps the cells done dark while its entrance waits', () => {
    render(<QuestLine quest={QUEST} isWaiting />);

    expect(litCells()).toHaveLength(0);
  });

  it('lights the cells one by one as it enters', () => {
    render(<QuestLine quest={QUEST} isEntering />);

    expect([...litCells()].every((cell) => cell.classList.contains('animate-cell-in'))).toBe(true);
  });

  it('says the top level is reached in a line, without cells or the level named again', () => {
    render(<QuestLine quest={levelQuest(5, 0)} />);

    expect([screen.queryByRole('img'), screen.queryByText('Reliable'), screen.getByText('The highest level. An abandoned duel can lower it.')]).toEqual([
      null,
      null,
      expect.anything(),
    ]);
  });

  it('puts the score under the cells and the badge beside both when stacked', () => {
    render(<QuestLine quest={QUEST} isStacked />);

    const [cells, score, badge] = [...screen.getByRole('img').children];
    expect([cells, score, badge].map((part) => part.className.match(/\[grid-area:(\w+)\]/)?.[1])).toEqual(['cells', 'score', 'goal']);
  });
});
