import { useMemo } from 'react';
import { buildQrPath, QR_QUIET_ZONE } from '@/lib/addressQr';

interface AddressQrProps {
  /** The player's own address, exactly as shown: the code encodes this string. */
  address: string;
  label: string;
}

/** The address as a QR code a phone's wallet scans, with the light margin round it a scan needs. */
export function AddressQr({ address, label }: AddressQrProps) {
  const { size, path } = useMemo(() => buildQrPath(address), [address]);
  const box = size + QR_QUIET_ZONE * 2;

  return (
    <div className="rounded-tile border-[1.5px] border-line bg-paper p-1.5">
      <svg
        role="img"
        aria-label={label}
        viewBox={`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${box} ${box}`}
        shapeRendering="crispEdges"
        className="block h-auto w-full rounded-[10px]"
      >
        <rect x={-QR_QUIET_ZONE} y={-QR_QUIET_ZONE} width={box} height={box} className="fill-paper" />
        <path d={path} className="fill-ink" />
      </svg>
    </div>
  );
}
