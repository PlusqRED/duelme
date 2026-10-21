'use client';

import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface InviteLinkBoxProps {
  /** The duel's link, a private one with its key after the #; null when this browser lacks the key. */
  link: string | null;
  isPublic: boolean;
}

/**
 * The invite link to send, with Copy and who it lets in. A private duel's link is useless without
 * its key, so a browser that lacks the key says so and offers nothing to copy rather than a bare
 * `/duel/{id}`.
 */
export function InviteLinkBox({ link, isPublic }: InviteLinkBoxProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const { copied, copy } = useCopyFeedback('toast.copyFailed', 1800);

  return (
    <div className="grid grid-cols-1 gap-2 rounded-[18px] bg-canvas p-3.5">
      <label htmlFor={inputId} className="flex items-center gap-1.5 text-sm font-strong">
        <Icon name="link" className="size-[17px]" />
        {t('room.share.label')}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          readOnly
          value={link ? link.replace(/^https?:\/\//, '') : t('room.share.unavailable')}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(
            'mb-1 h-12 min-w-0 flex-1 truncate rounded-[14px] border-[1.5px] border-line-strong bg-paper px-3.5 text-body-sm font-label outline-none focus:border-ink',
            link ? 'text-ink' : 'text-ink-3'
          )}
        />
        <Button
          variant="paper"
          disabled={!link}
          onClick={() => link && void copy(link)}
          className={cn(copied && 'bg-good text-paper [--keycap-edge:var(--color-good-ink)] [--keycap-ring:transparent]')}
        >
          <Icon name={copied ? 'check' : 'copy'} />
          <span aria-live="polite">{t(copied ? 'room.share.copied' : 'room.share.copy')}</span>
        </Button>
      </div>
      <p className="flex items-start gap-1.5 text-sm text-ink-2">
        <Icon name={isPublic ? 'globe' : 'lock'} className="mt-0.5 size-4" />
        {t(isPublic ? 'room.share.public' : 'room.share.private')}
      </p>
    </div>
  );
}
