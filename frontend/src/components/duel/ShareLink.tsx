'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppToast } from '@/hooks/useAppToast';
import { copyText } from '@/lib/clipboard';
import { buildDuelLink, isPublicDuel } from '@/lib/invite';
import { Copy, Check } from 'lucide-react';

interface ShareLinkProps {
  duelId: number;
  inviteHash: `0x${string}`;
  inviteSecret: `0x${string}` | null;
}

export function ShareLink({ duelId, inviteHash, inviteSecret }: ShareLinkProps) {
  const { t } = useTranslation();
  const appToast = useAppToast();
  const [copied, setCopied] = useState(false);
  const isPublic = isPublicDuel(inviteHash);
  const url =
    typeof window !== 'undefined'
      ? buildDuelLink(duelId, inviteHash, inviteSecret)
      : '';
  const canCopy = isPublic || !!inviteSecret;

  async function handleCopy() {
    if (!url || !canCopy) {
      appToast.error('duel.privateInviteUnavailable');
      return;
    }

    if (!(await copyText(url))) {
      appToast.error('toast.copyFailed');
      return;
    }
    setCopied(true);
    appToast.success('action.copied');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">
        {t('action.share')}
      </label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={canCopy ? url : t('duel.privateInviteUnavailable')}
          className="h-10 flex-1 border-slate-300 bg-slate-50 font-mono text-sm"
        />
        <Button
          size="lg"
          variant="outline"
          className="h-10 shrink-0 border-slate-300"
          onClick={handleCopy}
          disabled={!canCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        {isPublic
          ? t('duel.sharePublic')
          : inviteSecret
            ? t('duel.sharePrivate')
            : t('duel.privateInviteUnavailable')}
      </p>
    </div>
  );
}
