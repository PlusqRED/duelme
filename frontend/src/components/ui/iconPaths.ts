/**
 * The design's icons, drawn on a 24-unit grid. Each is a list of shapes that `Icon` turns into SVG
 * elements: a path is stroked unless it is filled, and circles and rectangles are stroked.
 */
export type IconShape =
  | { readonly d: string; readonly filled?: true }
  | { readonly cx: number; readonly cy: number; readonly r: number }
  | {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly rx: number;
    };

export const iconPaths = {
  alert: [{ d: 'M12 4.5l8.5 15h-17z' }, { d: 'M12 10v4M12 16.8h.01' }],
  'arrow-left': [{ d: 'M19 12H5.5M11 6l-6 6 6 6' }],
  blocks: [
    { x: 4, y: 4, width: 7, height: 7, rx: 1.5 },
    { x: 13, y: 4, width: 7, height: 7, rx: 1.5 },
    { x: 4, y: 13, width: 7, height: 7, rx: 1.5 },
    { d: 'M16.5 13.5v6M13.5 16.5h6' },
  ],
  check: [{ d: 'M5 12.5l4.5 4.5L19 7.5' }],
  chevron: [{ d: 'M6.5 9.5L12 15l5.5-5.5' }],
  'chevron-right': [{ d: 'M9.5 6.5L15 12l-5.5 5.5' }],
  clock: [{ cx: 12, cy: 12, r: 8.5 }, { d: 'M12 7.5V12l3 2' }],
  code: [{ d: 'M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14' }],
  copy: [
    { x: 8.5, y: 8.5, width: 11, height: 11, rx: 2.5 },
    { d: 'M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5' },
  ],
  external: [
    { d: 'M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10' },
  ],
  eye: [
    { d: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z' },
    { cx: 12, cy: 12, r: 2.8 },
  ],
  flag: [{ d: 'M6 20.5v-16' }, { d: 'M6 5h11l-2.4 4 2.4 4H6' }],
  flask: [
    { d: 'M9 4.5h6M10 4.5v5.2L5.6 17.3A1.5 1.5 0 0 0 6.9 19.5h10.2a1.5 1.5 0 0 0 1.3-2.2L14 9.7V4.5M7.6 14.5h8.8' },
  ],
  forward: [{ d: 'M4.5 6.5l7 5.5-7 5.5zM12.5 6.5l7 5.5-7 5.5z' }],
  fuel: [
    { d: 'M5 19.5V6a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14 6v13.5M3.5 19.5h12M14 10h2a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 0 3 0V8.5L18 6M7.5 8h4' },
  ],
  gamepad: [
    { d: 'M7.5 7h9a4.5 4.5 0 0 1 4.4 5.5l-.9 4a2.6 2.6 0 0 1-4.5 1.1l-1.7-2.1h-3.6l-1.7 2.1A2.6 2.6 0 0 1 4 16.5l-.9-4A4.5 4.5 0 0 1 7.5 7z' },
    { d: 'M8 10v3M6.5 11.5h3M15.5 10.5h.01M17 12.5h.01' },
  ],
  globe: [
    { cx: 12, cy: 12, r: 8.5 },
    { d: 'M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5z' },
  ],
  key: [{ cx: 8, cy: 15.5, r: 4 }, { d: 'M10.9 12.6l8.6-8.6M16.5 7l2.5 2.5M14.2 9.3l2 2' }],
  link: [
    { d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1' },
    { d: 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' },
  ],
  list: [
    { d: 'M9 6.5h10.5M9 12h10.5M9 17.5h10.5' },
    { cx: 5, cy: 6.5, r: 0.9 },
    { cx: 5, cy: 12, r: 0.9 },
    { cx: 5, cy: 17.5, r: 0.9 },
  ],
  lock: [
    { x: 5.5, y: 11, width: 13, height: 9.5, rx: 2.5 },
    { d: 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3' },
  ],
  login: [{ d: 'M13.5 4.5h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-4M10 8l4 4-4 4M14 12H4.5' }],
  logout: [{ d: 'M10.5 4.5h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4M14 8l4 4-4 4M18 12H9' }],
  mail: [{ x: 3.5, y: 5.5, width: 17, height: 13, rx: 2.5 }, { d: 'M4.5 7.5l7.5 5.5 7.5-5.5' }],
  menu: [{ d: 'M4.5 7h15M4.5 12h15M4.5 17h15' }],
  pause: [{ d: 'M8.5 6v12M15.5 6v12' }],
  pen: [{ d: 'M15.5 5.5l3 3L9 18H6v-3z' }, { d: 'M13.5 7.5l3 3M4.5 20.5h15' }],
  play: [
    { d: 'M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.2 5.1a.8.8 0 0 0-1.2.7z', filled: true },
  ],
  plus: [{ d: 'M12 5.5v13M5.5 12h13' }],
  replay: [{ d: 'M4.8 12a7.2 7.2 0 1 0 2.1-5.1' }, { d: 'M4.5 4.5v3.8h3.8' }],
  // The safe's lock: the shackle is its first path, so a safe opening can lift it alone.
  safe: [
    { x: 5.5, y: 11, width: 13, height: 9.5, rx: 2.5 },
    { d: 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3' },
    { d: 'M12 14.6v2.4' },
  ],
  search: [{ cx: 11, cy: 11, r: 6.5 }, { d: 'M16 16l4.5 4.5' }],
  send: [{ d: 'M20.5 4.5L3.5 11l6 2.5 2.5 6z' }, { d: 'M9.5 13.5l4-3.5' }],
  'shield-alert': [
    { d: 'M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z' },
    { d: 'M12 8.5v4M12 16h.01' },
  ],
  'shield-check': [
    { d: 'M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z' },
    { d: 'M8.8 12.2l2.2 2.2 4.3-4.6' },
  ],
  'shield-question': [
    { d: 'M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z' },
    { d: 'M10 9.8a2.1 2.1 0 1 1 3 1.9c-.6.3-1 .8-1 1.5v.3M12 16.2h.01' },
  ],
  sliders: [
    { d: 'M4 7h10M18 7h2M4 17h2M10 17h10' },
    { cx: 16, cy: 7, r: 2 },
    { cx: 8, cy: 17, r: 2 },
  ],
  sparkles: [
    { d: 'M10 4.5l1.6 4.4 4.4 1.6-4.4 1.6L10 16.5l-1.6-4.4L4 10.5l4.4-1.6z' },
    { d: 'M17.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z' },
  ],
  trophy: [
    { d: 'M8 4.5h8v5a4 4 0 0 1-8 0z' },
    { d: 'M8 6.5H5.5a2.5 2.5 0 0 0 2.6 3.4M16 6.5h2.5a2.5 2.5 0 0 1-2.6 3.4M12 13.5v3.5M8.5 19.5h7' },
  ],
  undo: [{ d: 'M9 7.5L4.5 12 9 16.5' }, { d: 'M4.5 12h9.5a5 5 0 0 1 0 10h-2.5' }],
  unlock: [
    { x: 5.5, y: 11, width: 13, height: 9.5, rx: 2.5 },
    { d: 'M8.5 11V8a3.5 3.5 0 0 1 6.9-.8' },
  ],
  wallet: [
    { d: 'M18.5 8V6.5a2 2 0 0 0-2-2H6A2.5 2.5 0 0 0 3.5 7v10A2.5 2.5 0 0 0 6 19.5h12.5a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2H6a2.5 2.5 0 0 1-2.5-2.5' },
    { d: 'M16.5 14h.01' },
  ],
  withdraw: [
    { d: 'M12 14.5v-10M7.8 8.7L12 4.5l4.2 4.2' },
    { d: 'M5 13.5v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4' },
  ],
  x: [{ d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' }],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof iconPaths;
