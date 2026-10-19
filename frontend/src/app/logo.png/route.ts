import { renderBrandTile } from '@/lib/brandImage';

export const dynamic = 'force-static';

/** The logo at a fixed address, for search engines (the site's JSON-LD names it). */
export function GET() {
  return renderBrandTile(512, { rounded: false });
}
