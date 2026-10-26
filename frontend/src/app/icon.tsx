import { renderBrandTile } from '@/lib/brandImage';

export const contentType = 'image/png';

/** A tab's size, and one above 48px, which Google asks of a favicon it shows beside a result. */
const SIDES = [32, 96] as const;

export function generateImageMetadata() {
  return SIDES.map((side) => ({ id: String(side), size: { width: side, height: side }, contentType }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const requested = await id;
  const side = SIDES.find((option) => String(option) === requested) ?? SIDES[0];
  return renderBrandTile(side, { rounded: true });
}
