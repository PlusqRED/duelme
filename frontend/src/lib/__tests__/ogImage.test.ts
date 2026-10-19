import { describe, expect, it } from 'vitest';
import { renderBrandTile } from '@/lib/brandImage';
import { OG_IMAGE_CONTENT_TYPE, renderBrandOgImage } from '@/lib/ogImage';

// Drawn for real, fonts included: a font path that broke would fail here rather than in a share.
describe('brand images', () => {
  it('draws the share image as a PNG, with the bundled fonts', async () => {
    const image = await renderBrandOgImage();
    const png = new Uint8Array(await image.arrayBuffer());

    expect(image.headers.get('content-type')).toBe(OG_IMAGE_CONTENT_TYPE);
    expect([...png.slice(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  });

  it('draws the brand tile as a PNG', async () => {
    const image = renderBrandTile(32, { rounded: true });
    const png = new Uint8Array(await image.arrayBuffer());

    expect([...png.slice(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  });
});
