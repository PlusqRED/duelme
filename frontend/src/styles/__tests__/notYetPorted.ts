/**
 * Files the redesign has not reached yet, and the old colours they still paint with. Each screen's
 * port takes its files off these lists, which only shrink; the last port deletes them.
 */

/** Files still coloured from Tailwind's own palette (`bg-slate-50`, `text-white`) instead of the theme. */
export const STILL_ON_PALETTE: readonly string[] = [
  'components/duel/GuidedTransactionDialog.tsx',
  'components/duel/GuidedTransactionStepIndicator.tsx',
];

/** Files still holding colour values (`#eef2ff`, `rgba(…)`) outside the theme. */
export const STILL_RAW_COLOURS: readonly string[] = [
  'components/duel/GuidedTransactionStepIndicator.tsx',
];
