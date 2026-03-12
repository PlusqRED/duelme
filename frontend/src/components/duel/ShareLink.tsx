'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppToast } from '@/hooks/useAppToast';
import { buildInviteLink } from '@/lib/invite';
import { Copy, Check } from 'lucide-react';

interface ShareLinkProps {
  duelId: number;
  inviteSecret: `0x${string}` | null;
}

export function ShareLink({ duelId, inviteSecret }: ShareLinkProps) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== 'undefined' && inviteSecret
      ? buildInviteLink(duelId, inviteSecret)
      : '';

  async function handleCopy() {
    if (!url) {
      appToast.error('duel.privateInviteUnavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      appToast.success('action.copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      appToast.error('toast.copyFailed');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">
        {t('action.share')}
      </label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={url || t('duel.privateInviteUnavailable')}
          className="h-10 flex-1 border-slate-300 bg-slate-50 font-mono text-sm"
        />
        <Button
          size="lg"
          variant="outline"
          className="h-10 shrink-0 border-slate-300"
          onClick={handleCopy}
          disabled={!inviteSecret}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        {inviteSecret ? t('duel.privateInviteRequired') : t('duel.privateInviteUnavailable')}
      </p>
    </div>
  );
}
