import { Avatar } from '@/components/identity/Avatar';
import { Icon } from '@/components/ui/icon';
import type { SendStage } from '@/lib/sendUsdt';
import { cn } from '@/lib/utils';

interface SendRouteProps {
  /** Where the transfer is; under review it has not left yet. */
  stage: SendStage | 'review';
  from: string;
  to: string;
}

/**
 * Your wallet, the track and the address. The plane crosses while the transfer is on the network
 * and lands on a check, or stays home when the transfer did not go.
 */
export function SendRoute({ stage, from, to }: SendRouteProps) {
  const isDone = stage === 'done';
  const isStopped = stage === 'rejected' || stage === 'failed';

  return (
    <div aria-hidden="true" className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center rounded-tile bg-canvas px-3 py-2.5">
      <Avatar address={from} tone="ink" className="size-10" />
      <span
        className={cn(
          'relative mx-2 h-[30px] before:absolute before:inset-x-0 before:top-1/2 before:border-t-2 before:transition-colors',
          isDone ? 'before:border-solid before:border-good' : 'before:border-dashed before:border-line-strong'
        )}
      >
        <span
          className={cn(
            'absolute inset-0',
            stage === 'sending' && 'animate-plane-fly',
            isDone && 'translate-x-[calc(100%-30px)]'
          )}
        >
          <span
            className={cn(
              'grid size-[30px] place-items-center rounded-full text-paper',
              isStopped ? 'bg-ink-3' : 'bg-ink',
              isDone && 'animate-plane-land'
            )}
          >
            <Icon name="send" className="size-4" />
          </span>
        </span>
      </span>
      <span className="relative">
        <Avatar address={to} tone="paper" className="size-10" />
        {(isDone || isStopped) && (
          <span
            className={cn(
              'absolute -right-[5px] -bottom-[5px] grid size-5 place-items-center rounded-full border-2 border-canvas text-paper',
              isDone ? 'animate-pop bg-good [animation-delay:0.2s]' : 'bg-orange'
            )}
          >
            <Icon name={isDone ? 'check' : 'x'} className="size-3 stroke-3" />
          </span>
        )}
      </span>
    </div>
  );
}
