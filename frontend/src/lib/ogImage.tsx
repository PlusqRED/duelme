import { ImageResponse } from 'next/og';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT = 'DuelMe — 1v1 USDT duels on Arbitrum, 0% platform fee';
export const OG_IMAGE_CONTENT_TYPE = 'image/png';

export function renderBrandOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background:
            'radial-gradient(circle at 25% 20%, rgba(99, 102, 241, 0.45) 0%, transparent 55%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.35) 0%, transparent 50%), linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: '64px',
        }}
      >
        <div
          style={{
            fontSize: '88px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #818CF8 0%, #34D399 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
            marginBottom: '40px',
          }}
        >
          DuelMe
        </div>

        <div
          style={{
            fontSize: '60px',
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            maxWidth: '950px',
            marginBottom: '36px',
            display: 'flex',
          }}
        >
          1v1 USDT Duels.
        </div>
        <div
          style={{
            fontSize: '40px',
            fontWeight: 600,
            color: '#A5B4FC',
            textAlign: 'center',
            marginBottom: '48px',
            display: 'flex',
          }}
        >
          Winner takes 100%. Not 95%.
        </div>

        <div
          style={{
            display: 'flex',
            gap: '40px',
            fontSize: '28px',
            fontWeight: 600,
            color: '#E2E8F0',
          }}
        >
          <div
            style={{
              padding: '14px 28px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(165, 180, 252, 0.4)',
              display: 'flex',
            }}
          >
            0% Platform Fee
          </div>
          <div
            style={{
              padding: '14px 28px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              display: 'flex',
            }}
          >
            On-Chain · Arbitrum
          </div>
          <div
            style={{
              padding: '14px 28px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
            }}
          >
            No KYC
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            fontSize: '24px',
            color: '#94A3B8',
            display: 'flex',
          }}
        >
          duelme.pro
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
