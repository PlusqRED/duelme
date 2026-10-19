import { ImageResponse } from 'next/og';
import { brandColors } from '@/lib/brandColors';

/** The mark's width in its own pixels: two 10px dots and a 15px square, 3px apart. */
const MARK_WIDTH = 41;

interface BrandMarkImageProps {
  unit: number;
}

/**
 * The brand mark for `ImageResponse`, which reads inline styles only; `unit` is the size of one of
 * the mark's pixels. `components/identity/BrandMark.tsx` draws the same shapes for the page.
 */
export function BrandMarkImage({ unit }: BrandMarkImageProps) {
  const dot = { width: 10 * unit, height: 10 * unit, borderRadius: 5 * unit };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 * unit }}>
      <div style={{ ...dot, background: brandColors.red }} />
      <div style={{ width: 15 * unit, height: 15 * unit, borderRadius: 4 * unit, background: brandColors.ink }} />
      <div style={{ ...dot, background: brandColors.blue }} />
    </div>
  );
}

/** The mark across a paper square: the favicon (rounded), the home-screen icon and the logo. */
export function renderBrandTile(size: number, { rounded }: { rounded: boolean }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: brandColors.paper,
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <BrandMarkImage unit={(size * 0.8) / MARK_WIDTH} />
      </div>
    ),
    { width: size, height: size }
  );
}
