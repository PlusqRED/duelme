'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';

interface CopyableAddressProps {
  address: string;
  className?: string;
  nickname?: string | null;
  href?: string;
}

export function CopyableAddress({ address, className, nickname, href }: CopyableAddressProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  }, [address]);

  const content = (
    <span className="flex flex-col items-center gap-0.5">
      {nickname && (
        <span className="text-sm font-semibold text-slate-900">{nickname}</span>
      )}
      <button
        type="button"
        className={`group inline-flex items-center gap-1.5 font-mono text-sm transition-colors ${className ?? 'text-slate-600 hover:text-slate-900'}`}
        onClick={handleCopy}
        title={address}
      >
        <span className="truncate">{truncateAddress(address)}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    </span>
  );

  if (href) {
    return (
      <Link href={href} onClick={(e) => e.stopPropagation()} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
