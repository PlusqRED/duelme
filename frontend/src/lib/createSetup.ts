import type { Game, GameCategory } from '@/lib/game';
import { findGameByName, normalizeGameName } from '@/lib/gameSearch';

/**
 * The create page's setup, as the landing's quest: four steps, one open at a time. A step that has
 * been opened and answered is done and shows its answer on its line, so the closed steps are the
 * review; one that lost its answer (a stake under a raised minimum) is a problem until fixed.
 */
export const SETUP_STEPS = ['game', 'stake', 'access', 'message'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** Which steps hold an answer the duel can be created with. */
export type SetupAnswers = Record<SetupStep, boolean>;

/** The open step, none once every step is answered, and the steps opened so far. */
export interface SetupProgress {
  open: SetupStep | null;
  visited: Record<SetupStep, boolean>;
}

export type StepStatus = 'current' | 'done' | 'problem' | 'locked' | 'ahead';

/** What stands between the player and Create duel, first thing first; the terms come before signing in. */
export type WayOn = 'game' | 'stake' | 'message' | 'signIn' | 'short' | 'ready';

export const FRESH_SETUP: SetupProgress = {
  open: 'game',
  visited: { game: true, stake: false, access: false, message: false },
};

/** A step opens once every step before it is answered. */
export function isReachable(step: SetupStep, answers: SetupAnswers): boolean {
  return SETUP_STEPS.slice(0, SETUP_STEPS.indexOf(step)).every((before) => answers[before]);
}

export function stepStatus(step: SetupStep, progress: SetupProgress, answers: SetupAnswers): StepStatus {
  if (progress.open === step) return 'current';
  if (!isReachable(step, answers)) return 'locked';
  if (!progress.visited[step]) return 'ahead';
  return answers[step] ? 'done' : 'problem';
}

/** Opens `step`, which counts as seen from then on; none closes them all. */
export function openStep(progress: SetupProgress, step: SetupStep | null): SetupProgress {
  return { open: step, visited: step ? { ...progress.visited, [step]: true } : progress.visited };
}

/** After `from`: the next step that still needs an answer, or none, when every choice sits on its line. */
export function advance(progress: SetupProgress, from: SetupStep, answers: SetupAnswers): SetupProgress {
  const next = SETUP_STEPS.slice(SETUP_STEPS.indexOf(from) + 1).find((step) => !progress.visited[step] || !answers[step]);
  return openStep(progress, next ?? null);
}

/**
 * The setup of a draft brought back after a reload: past a picked game and a stake, every step counts
 * as seen, and the first one that still needs an answer opens, none when the duel is ready.
 */
export function restoredSetup(answers: SetupAnswers): SetupProgress {
  const isPastStake = answers.game && answers.stake;
  const visited = { game: true, stake: answers.game, access: isPastStake, message: isPastStake };
  const open = SETUP_STEPS.find((step) => !visited[step] || !answers[step]) ?? null;
  return { open, visited };
}

export function wayOn(answers: SetupAnswers, { isSignedIn, isShort }: { isSignedIn: boolean; isShort: boolean }): WayOn {
  if (!answers.game) return 'game';
  if (!answers.stake) return 'stake';
  if (!answers.message) return 'message';
  if (!isSignedIn) return 'signIn';
  return isShort ? 'short' : 'ready';
}

const NEW_GAME = 'new:';

/**
 * A game typed into "Add a game": the catalog's own when it has one by that name however spelled, so
 * no game is listed twice; else a new one, which the backend adds to the catalog, with its category,
 * when the duel's game is saved.
 */
export function addedGame(games: readonly Game[], name: string, category: GameCategory): Game {
  const known = findGameByName(games, name);
  if (known) return known;
  const trimmed = name.trim();
  return {
    slug: `${NEW_GAME}${normalizeGameName(trimmed)}`,
    name: trimmed,
    iconUrl: null,
    category,
    duelCount: 0,
    createdAt: null,
    updatedAt: null,
  };
}

/** A game added on this page, not in the catalog yet. */
export function isNewGame(game: Pick<Game, 'slug'>): boolean {
  return game.slug.startsWith(NEW_GAME);
}

/** The duel's number in the path of its page, `/duel/7` or `/duel/7#…`; null for any other path. */
export function duelIdOfPath(path: string): number | null {
  const match = /^\/duel\/(\d+)(?:[#?]|$)/.exec(path);
  return match ? Number(match[1]) : null;
}
