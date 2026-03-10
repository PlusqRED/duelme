'use client';

import { useReputation, type ReputationLevel } from '@/hooks/useReputation';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Sparkles } from 'lucide-react';

const CONFIG: Record<
  ReputationLevel,
  {
    icon: typeof Shield;
    bg: string;
    text: string;
    border: string;
    labelKey: TranslationKey;
  }
> = {
  new: {
    icon: Sparkles,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    labelKey: 'rep.new',
  },
  honorable: {
    icon: ShieldCheck,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    labelKey: 'rep.honorable',
  },
  fair: {
    icon: ShieldQuestion,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    labelKey: 'rep.fair',
  },
  unreliable: {
    icon: ShieldAlert,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    labelKey: 'rep.unreliable',
  },
};

interface ReputationBadgeProps {
  address: `0x${string}` | undefined;
  chainId: number;
  showStats?: boolean;
}

export function ReputationBadge({ address, chainId, showStats = false }: ReputationBadgeProps) {
  const { t } = useTranslation();
  const { honored, total, score, level, isLoading } = useReputation(address, chainId);

  if (isLoading || !address) {
    return (
      <span className="inline-flex h-6 w-16 animate-pulse rounded-full bg-slate-100" />
    );
  }

  const cfg = CONFIG[level];
  const Icon = cfg.icon;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        <Icon className="h-3 w-3" />
        {t(cfg.labelKey)}
      </span>
      {showStats && total > 0 && (
        <span className="text-[10px] text-slate-400">
          {honored}/{total} · {score >= 0 ? Math.round(score * 100) : 0}%
        </span>
      )}
    </div>
  );
}
