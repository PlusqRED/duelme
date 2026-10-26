import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { translator } from '@/i18n/translate';
import type { Language } from '@/i18n/translations';
import { brandColors } from '@/lib/brandColors';
import { BrandMarkImage } from '@/lib/brandImage';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = 'image/png';

/** The motto's size, as large as its longest line allows on one line of the image: Russian runs longer. */
const MOTTO_SIZE: Record<Language, number> = { en: 92, ru: 72 };

/** Where a page's share image is, in the page's language: `app/og/[language]/route.tsx` draws it. */
export function shareImagePath(language: Language): string {
  return `/og/${language}`;
}

// `ImageResponse` reads TTF, OTF and WOFF but not the WOFF2 `next/font` serves, so the share
// images carry their own copy of Geologica (SIL Open Font License, next to the files).
async function geologica(weight: 400 | 700 | 800) {
  const data = await readFile(join(process.cwd(), `src/assets/fonts/Geologica-${weight}.woff`));
  return { name: 'Geologica', data, weight, style: 'normal' as const };
}

/** The image a shared link shows, in the page's language: the mark, the motto, what a duel is, and the site. */
export async function renderBrandOgImage(language: Language) {
  const { t } = translator(language);
  const motto = [t('motto.1'), t('motto.2')];
  const facts = [t('seo.image.fee'), t('seo.image.escrow'), 'Arbitrum'];

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
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>{SITE_NAME}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: brandColors.ink3 }}>{new URL(SITE_URL).host}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {motto.map((line) => (
            <div key={line} style={{ fontSize: MOTTO_SIZE[language], fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.04em' }}>
              {line}
            </div>
          ))}
          <div style={{ marginTop: 32, fontSize: 36, fontWeight: 400, color: brandColors.ink2 }}>
            {t('seo.image.line')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {facts.map((fact) => (
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
