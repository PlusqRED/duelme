'use client';

import { Disclosure } from '@/components/sign/Disclosure';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useTranslation } from '@/i18n/useTranslation';

/** The raw error behind a message, folded away, with Copy for sending it on. */
export function ErrorDetails({ text }: { text: string }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyFeedback('wallet.copyFailed');

  return (
    <Disclosure summary={t('sign.err.details')} className="mx-auto mt-1 max-w-[52ch]">
      <p className="mx-3.5 rounded-[10px] bg-paper px-3 py-2.5 text-note leading-normal whitespace-pre-wrap text-ink-2 tabular-nums [overflow-wrap:anywhere]">
        {text}
      </p>
      <Button type="button" variant="paper" size="sm" onClick={() => void copy(text)} className="mx-3.5 mt-2.5 mb-3.5">
        <Icon name={copied ? 'check' : 'copy'} />
        {t(copied ? 'wallet.copied' : 'wallet.copy')}
      </Button>
    </Disclosure>
  );
}
