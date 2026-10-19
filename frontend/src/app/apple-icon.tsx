import { renderBrandTile } from '@/lib/brandImage';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// The home screen rounds the corners itself.
export default function AppleIcon() {
  return renderBrandTile(size.width, { rounded: false });
}
