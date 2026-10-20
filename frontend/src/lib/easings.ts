/**
 * The theme's easings, for a move made in script: the Web Animations API takes no CSS variable. A
 * test keeps each equal to its token in `styles/theme.css`.
 */
export const easings = {
  /** A quick start that settles. */
  sheet: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  /** Overshoots a hair and settles: a cell that pops, a mark that bumps. */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;
