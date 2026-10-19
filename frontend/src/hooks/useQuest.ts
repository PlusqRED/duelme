'use client';

import { useState } from 'react';

export const QUEST_STEPS = 4;

interface QuestState {
  /** The step being shown, 1 to `QUEST_STEPS`, or one past the last once the quest is done. */
  reached: number;
  /** Which way the last move went: on to a later step, back to an earlier one, or none yet. */
  direction: 1 | -1 | 0;
}

/**
 * The landing's first-duel quest: four steps, one shown at a time, walked on with Next, jumped
 * between from the list, and done after the last.
 */
export function useQuest() {
  const [{ reached, direction }, setState] = useState<QuestState>({ reached: 1, direction: 0 });

  function goTo(next: number) {
    if (next !== reached) {
      setState({ reached: next, direction: next > reached ? 1 : -1 });
    }
  }

  return {
    reached,
    direction,
    step: Math.min(reached, QUEST_STEPS),
    isDone: reached > QUEST_STEPS,
    goTo,
    next: () => goTo(Math.min(reached + 1, QUEST_STEPS + 1)),
    replay: () => goTo(1),
  };
}

export type Quest = ReturnType<typeof useQuest>;
