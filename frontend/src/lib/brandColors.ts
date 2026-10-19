/**
 * Theme colours for the places a stylesheet cannot reach — the browser's theme colour and Privy's
 * login window take a hex string. Each one is a copy of its token in `styles/theme.css`, and
 * `brandColors.test.ts` keeps them equal.
 */
export const brandColors = {
  canvas: '#f1f4fb',
  ink: '#121a3e',
} as const;
