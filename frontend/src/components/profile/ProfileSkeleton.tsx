import { PageColumn } from '@/components/layout/PageColumn';

/** A profile's shape while it loads: the face, the name and the two columns of cards. */
export function ProfileSkeleton() {
  return (
    <PageColumn>
      <div aria-hidden="true" className="grid gap-[clamp(28px,4vw,44px)]">
        <div className="flex items-center gap-[clamp(16px,2.6vw,28px)]">
          <div className="size-[clamp(92px,calc(11vw+8px),128px)] shrink-0 animate-pulse rounded-full bg-paper" />
          <div className="grid flex-1 gap-3">
            <div className="h-12 w-[min(340px,80%)] animate-pulse rounded-2xl bg-paper" />
            <div className="h-6 w-40 animate-pulse rounded-full bg-paper" />
          </div>
        </div>
        <div className="grid gap-5 split:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="h-[22rem] animate-pulse rounded-[28px] bg-paper" />
          <div className="h-[22rem] animate-pulse rounded-[28px] bg-paper max-split:hidden" />
        </div>
      </div>
    </PageColumn>
  );
}
