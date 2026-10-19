/**
 * Theme colours for the places a stylesheet cannot reach — the browser's theme colour, and the
 * favicon, logo and share images that `ImageResponse` draws from inline styles. Each one is a copy
 * of its token in `styles/theme.css`, and `brandColors.test.ts` keeps them equal.
 */
export const brandColors = {
  canvas: '#f1f4fb',
  paper: '#ffffff',
  ink: '#121a3e',
  ink2: '#454d70',
  ink3: '#626a88',
  line: '#dde2ef',
  red: '#dc3426',
  blue: '#2b64f5',
} as const;
