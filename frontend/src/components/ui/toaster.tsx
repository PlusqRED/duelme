'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { Icon } from '@/components/ui/icon';

/** Toasts: a paper card whose icon says how it went — green done, orange went wrong, a clock under way. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      icons={{
        success: <Icon name="check" className="text-good-ink" />,
        error: <Icon name="alert" className="text-orange-ink" />,
        info: <Icon name="clock" className="text-ink-3" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-start gap-3 rounded-2xl border border-line bg-paper px-4 py-3.5 text-[0.9375rem] font-label text-ink shadow-menu',
          icon: 'mt-px',
          description: 'mt-0.5 text-sm font-normal text-ink-3',
        },
      }}
      {...props}
    />
  );
}
