'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { Copy, Check } from 'lucide-react';

interface ShareLinkProps {
  duelId: number;
}

export function ShareLink({ duelId }: ShareLinkProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/duel/${duelId}`
      : `/duel/${duelId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('action.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        {t('action.share')}
      </label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={url}
          className="h-10 flex-1 border-gray-300 bg-gray-50 font-mono text-sm"
        />
        <Button
          size="lg"
          variant="outline"
          className="h-10 shrink-0 border-gray-300"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
