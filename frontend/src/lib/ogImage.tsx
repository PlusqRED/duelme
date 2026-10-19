import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { brandColors } from '@/lib/brandColors';
import { BrandMarkImage } from '@/lib/brandImage';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT = 'DuelMe — 1v1 USDT duels on Arbitrum, 0% platform fee';
export const OG_IMAGE_CONTENT_TYPE = 'image/png';

const FACTS = ['0% platform fee', 'Stakes held by a smart contract', 'Arbitrum'];

// `ImageResponse` reads TTF, OTF and WOFF but not the WOFF2 `next/font` serves, so the share
// images carry their own copy of Geologica (SIL Open Font License, next to the files).
async function geologica(weight: 400 | 700 | 800) {
  const data = await readFile(join(process.cwd(), `src/assets/fonts/Geologica-${weight}.woff`));
  return { name: 'Geologica', data, weight, style: 'normal' as const };
}

/** The image a shared link shows: the mark, the motto, what a duel is, and the site. */
export async function renderBrandOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: brandColors.canvas,
          color: brandColors.ink,
          fontFamily: 'Geologica',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <BrandMarkImage unit={1.6} />
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>DuelMe</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: brandColors.ink3 }}>duelme.pro</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.04em' }}>
            Skill should pay you.
          </div>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.04em' }}>
            Not the platform.
          </div>
          <div style={{ marginTop: 32, fontSize: 36, fontWeight: 400, color: brandColors.ink2 }}>
            Play 1v1 for USDT. The winner takes the whole pot.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {FACTS.map((fact) => (
            <div
              key={fact}
              style={{
                display: 'flex',
                padding: '12px 22px',
                borderRadius: 999,
                background: brandColors.paper,
                border: `2px solid ${brandColors.line}`,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {fact}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts: await Promise.all([geologica(400), geologica(700), geologica(800)]) }
  );
}
