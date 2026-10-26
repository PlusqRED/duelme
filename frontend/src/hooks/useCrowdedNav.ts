'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Whether the bar's row of sections is wider than the room the bar leaves it, measured again
 * whenever either changes size: a font that loads, a section added on sign-in, the window, the
 * wallet's balance. Null on the server and until measured; a bar that is not displayed keeps the
 * last answer. That is told by the row, which has a width whenever it is laid out: a displayed room
 * can be squeezed to nothing, and a row with no room is crowded, not hidden.
 *
 * Crowded, the room carries `data-crowded` and the menu's button shows beside the wallet, taking
 * room the row would have. So the question is always asked of the bar without it: the attribute
 * is lifted for the measurement and put back before the browser paints. Measured with the button
 * there, a row that fits once the button is gone would never come back.
 */
export function useCrowdedNav(room: RefObject<HTMLElement | null>, row: RefObject<HTMLElement | null>): boolean | null {
  const [isCrowded, setIsCrowded] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const roomNode = room.current;
    const rowNode = row.current;
    if (!roomNode || !rowNode) return undefined;
    const measure = () => {
      const crowdedValue = roomNode.getAttribute('data-crowded');
      if (crowdedValue !== null) roomNode.removeAttribute('data-crowded');
      const roomWidth = roomNode.getBoundingClientRect().width;
      const rowWidth = rowNode.getBoundingClientRect().width;
      if (crowdedValue !== null) roomNode.setAttribute('data-crowded', crowdedValue);
      if (rowWidth === 0) return;
      setIsCrowded(rowWidth > roomWidth);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(roomNode);
    observer.observe(rowNode);
    return () => observer.disconnect();
  }, [room, row]);

  return isCrowded;
}
