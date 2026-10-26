'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

export type NavFit = 'fits' | 'crowded';

/** The mark the bar carries: its own classes read it, and so does the menu's button. */
const MARK = 'data-nav-fit';

export interface NavFitMark {
  [MARK]?: NavFit;
}

/**
 * Whether the bar's row of sections fits the room the bar leaves it, as the mark for the bar to
 * carry, measured again whenever either changes size: a font that loads, a section added on
 * sign-in, the window, the wallet's balance. No mark on the server and until measured; a bar that
 * is not displayed keeps the last one. That is told by the row, which has a width whenever it is
 * laid out: a displayed room can be squeezed to nothing, and a row with no room is crowded, not
 * hidden.
 *
 * Crowded, the menu's button shows beside the wallet, taking room the row would have. So the
 * question is always asked of the bar without it: the mark is lifted for the measurement and put
 * back before the browser paints. Measured with the button there, a row that fits once the button
 * is gone would never come back.
 */
export function useNavFit(room: RefObject<HTMLElement | null>, row: RefObject<HTMLElement | null>): NavFitMark {
  const [fit, setFit] = useState<NavFit | null>(null);

  useLayoutEffect(() => {
    const roomNode = room.current;
    const rowNode = row.current;
    if (!roomNode || !rowNode) return undefined;
    const measure = () => {
      const mark = roomNode.getAttribute(MARK);
      roomNode.removeAttribute(MARK);
      const roomWidth = roomNode.getBoundingClientRect().width;
      const rowWidth = rowNode.getBoundingClientRect().width;
      if (mark !== null) roomNode.setAttribute(MARK, mark);
      if (rowWidth === 0) return;
      setFit(rowWidth > roomWidth ? 'crowded' : 'fits');
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(roomNode);
    observer.observe(rowNode);
    return () => observer.disconnect();
  }, [room, row]);

  return fit === null ? {} : { [MARK]: fit };
}
