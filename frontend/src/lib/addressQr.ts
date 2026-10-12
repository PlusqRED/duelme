import { create } from 'qrcode';

/** Light modules around the symbol; the QR spec asks for four for a reliable scan. */
export const QR_QUIET_ZONE = 4;

export interface QrPath {
  /** Modules per side, without the quiet zone. */
  size: number;
  /** One SVG path covering every dark module, in module units. */
  path: string;
}

/**
 * Encodes `text` — and only `text` — as a QR symbol and returns it as an SVG path, so the
 * component can render it as plain React markup: no canvas, no `dangerouslySetInnerHTML`, no
 * network. Deposit QRs carry the bare address: an `ethereum:` URI with an amount or a token turns a
 * scan into a prefilled payment, which a wallet may send on whatever network it likes.
 */
export function buildQrPath(text: string): QrPath {
  const { modules } = create(text, { errorCorrectionLevel: 'M' });
  const { size } = modules;
  let path = '';

  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!modules.get(row, col)) {
        col++;
        continue;
      }
      const start = col;
      while (col < size && modules.get(row, col)) {
        col++;
      }
      // One rectangle per horizontal run keeps the path short without changing a single module.
      path += `M${start} ${row}h${col - start}v1h${start - col}z`;
    }
  }

  return { size, path };
}
