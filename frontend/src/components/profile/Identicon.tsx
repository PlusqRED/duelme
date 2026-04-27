'use client';

import { generateIdenticon } from '@/lib/identicon';
import { cn } from '@/lib/utils';

interface IdenticonProps {
  walletAddress: string;
  className?: string;
  size?: number;
}

export function Identicon({ walletAddress, className, size = 80 }: IdenticonProps) {
  const src = generateIdenticon(walletAddress);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- src is always a data URI; next/image does not support data URIs
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      aria-label="Avatar generated from wallet address"
      className={cn('rounded-full bg-slate-100', className)}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
}
