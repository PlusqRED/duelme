'use client';

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

interface GameBadgeProps {
  gameName: string;
  gameSlug?: string;
}

export function GameBadge({ gameName, gameSlug }: GameBadgeProps) {
  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      <Gamepad2 className="h-3 w-3" />
      {gameName}
    </span>
  );

  if (gameSlug) {
    return (
      <Link href={`/games/${gameSlug}`} className="transition-opacity hover:opacity-80">
        {badge}
      </Link>
    );
  }
  return badge;
}
