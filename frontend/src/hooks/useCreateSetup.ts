'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCreateDuelDraftStorage } from '@/hooks/useCreateDuelDraftStorage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ContractConfig } from '@/lib/contractConfig';
import type { CreateDuelDraft } from '@/lib/createDuelDraft';
import {
  FRESH_SETUP,
  advance,
  openStep,
  restoredSetup,
  type SetupAnswers,
  type SetupProgress,
  type SetupStep,
} from '@/lib/createSetup';
import { isDuelMessageValid, normalizeDuelMessage } from '@/lib/duelMessage';
import type { Game } from '@/lib/game';
import { readWager } from '@/lib/wagerInput';

/** A picked game shows as picked for a moment before the next step opens. */
const NEXT_STEP_MS = 320;

/** The duel as it is being set up: the fields as typed. */
export interface CreateForm {
  game: Game | null;
  stakeText: string;
  isPublic: boolean;
  message: string;
}

const EMPTY_FORM: CreateForm = { game: null, stakeText: '', isPublic: false, message: '' };

function answersOf(form: CreateForm, limits: ContractConfig): SetupAnswers {
  return {
    game: form.game !== null,
    stake: readWager(form.stakeText, limits.minWager).kind === 'valid',
    access: true,
    message: isDuelMessageValid(normalizeDuelMessage(form.message), limits),
  };
}

/** A stored game as the finder holds one: its count of duels is the catalog's to say. */
function gameOf(draft: NonNullable<CreateDuelDraft['game']>): Game {
  return { ...draft, iconUrl: null, duelCount: 0, createdAt: null, updatedAt: null };
}

interface UseCreateSetupArgs {
  chainId: number;
  limits: ContractConfig;
  /** The create call is with the wallet, or the duel exists: the stored copy is dropped, not written. */
  isDraftClosed: boolean;
}

/**
 * The create page's setup: the four answers, which step is open, and the way between them. The form
 * is kept in the tab as it is typed and comes back after a reload with every answered step closed on
 * its answer. `focusTurn` counts the steps the player opened, so a step takes the focus when they
 * open it, never when the page or a restored draft does.
 */
export function useCreateSetup({ chainId, limits, isDraftClosed }: UseCreateSetupArgs) {
  const isReduced = useReducedMotion();
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [progress, setProgress] = useState<SetupProgress>(FRESH_SETUP);
  const [focusTurn, setFocusTurn] = useState(0);
  const [applied, setApplied] = useState<CreateDuelDraft | null>(null);

  const stored = useMemo<CreateDuelDraft>(
    () => ({
      chainId,
      game: form.game && { slug: form.game.slug, name: form.game.name, category: form.game.category },
      amount: form.stakeText,
      message: form.message,
      isPublic: form.isPublic,
    }),
    [chainId, form]
  );
  const { restoredDraft } = useCreateDuelDraftStorage(stored, isDraftClosed);

  // Applied during render, once per restored draft, so the empty form is never shown on the way.
  if (restoredDraft && restoredDraft !== applied) {
    const restored: CreateForm = {
      game: restoredDraft.game && gameOf(restoredDraft.game),
      stakeText: restoredDraft.amount,
      isPublic: restoredDraft.isPublic,
      message: restoredDraft.message,
    };
    setApplied(restoredDraft);
    setForm(restored);
    setProgress(restoredSetup(answersOf(restored, limits)));
  }

  const reading = readWager(form.stakeText, limits.minWager);
  const message = normalizeDuelMessage(form.message);
  const answers = answersOf(form, limits);
  const answersRef = useRef(answers);
  const progressRef = useRef(progress);
  const pickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    answersRef.current = answers;
    progressRef.current = progress;
  });
  useEffect(() => () => clearTimeout(pickTimer.current), []);

  function update(fields: Partial<CreateForm>) {
    setForm((current) => ({ ...current, ...fields }));
  }

  /** The player opens a step, or none: it takes the focus. */
  function open(step: SetupStep | null) {
    setProgress((current) => openStep(current, step));
    setFocusTurn((turn) => turn + 1);
  }

  /** On from `from`: to the next step that still needs an answer, or to none when every one has it. */
  function next(from: SetupStep) {
    setProgress((current) => advance(current, from, answersRef.current));
    setFocusTurn((turn) => turn + 1);
  }

  function pickGame(game: Game) {
    update({ game });
    clearTimeout(pickTimer.current);
    pickTimer.current = setTimeout(
      () => {
        // Unless the player has moved on by themselves meanwhile.
        if (progressRef.current.open !== 'game') return;
        setProgress(advance(progressRef.current, 'game', { ...answersRef.current, game: true }));
        setFocusTurn((turn) => turn + 1);
      },
      isReduced ? 0 : NEXT_STEP_MS
    );
  }

  /** A fresh setup, for another duel. */
  function reset() {
    clearTimeout(pickTimer.current);
    setForm(EMPTY_FORM);
    setProgress(FRESH_SETUP);
    setFocusTurn((turn) => turn + 1);
  }

  return { form, reading, message, answers, progress, focusTurn, update, open, next, pickGame, reset };
}
