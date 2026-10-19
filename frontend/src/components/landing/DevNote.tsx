import { DevNoteMore } from '@/components/landing/DevNoteMore';
import { Icon } from '@/components/ui/icon';
import { getTranslation } from '@/i18n/serverTranslation';
import { daysAgoWords } from '@/lib/timeWords';

const TITLE_ID = 'devnote-title';

/** When this build was made: next.config.ts writes it in at build time. */
function builtAt(): string {
  const stamp = process.env.DUELME_BUILT_AT;
  if (!stamp) {
    throw new Error('DUELME_BUILT_AT is not set: next.config.ts writes it at build time');
  }
  return stamp;
}

/**
 * The developer's note, a sticky note taped to the page: plainly temporary, warm against the cool
 * page and slightly askew. It sticks on as the page opens and straightens when you reach for it.
 * The line under the title is the project: solid where duels work, a block being laid at the
 * frontier, marching dashes where the rest is being built.
 */
export async function DevNote() {
  const translation = await getTranslation();
  const { t } = translation;
  const stamp = builtAt();

  return (
    <aside
      aria-labelledby={TITLE_ID}
      className="relative mt-9 grid max-w-[520px] -rotate-[1.2deg] animate-stick gap-2.5 rounded-md bg-sticky px-5 pt-[22px] pb-2 shadow-sticky transition-[rotate] duration-450 ease-spring focus-within:rotate-0 hover:rotate-0 max-xs:mt-5 max-xs:px-3.5 max-xs:pt-3.5 max-xs:pb-1"
    >
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 h-6 w-[104px] -translate-x-1/2 rotate-[2.5deg] overflow-hidden rounded-xs bg-paper/50 shadow-tape"
      >
        <span className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,var(--color-paper)_0_6px,transparent_0_12px)] opacity-56" />
      </span>
      <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-note text-sun-ink">
        <span className="inline-flex items-center gap-2 font-strong text-ink">
          <i
            aria-hidden="true"
            className="relative size-2 rounded-full bg-red after:absolute after:inset-0 after:animate-on-air after:rounded-full after:bg-red"
          />
          {t('indie.live')}
        </span>
        <time dateTime={stamp}>{t('indie.updated', { when: daysAgoWords(new Date(stamp), new Date(), translation) })}</time>
      </p>
      <h2 id={TITLE_ID} className="text-body/[1.3] font-strong tracking-[-0.01em]">
        {t('indie.title')}
      </h2>
      <BuildLine />
      <p className="-mt-0.5 grid grid-cols-[calc(52%+22px)_minmax(0,1fr)] text-note text-ink-3">
        <span className="inline-flex items-center gap-[5px] font-label text-ink">
          <Icon name="check" className="size-3.5 stroke-[2.6]" />
          {t('indie.done')}
        </span>
        <span>{t('indie.next')}</span>
      </p>
      <DevNoteMore />
    </aside>
  );
}

function BuildLine() {
  return (
    <div aria-hidden="true" className="mt-0.5 flex h-[18px] items-center">
      <span className="relative h-1 flex-[0_0_52%] rounded-sm bg-ink before:absolute before:top-1/2 before:left-0 before:size-2.5 before:-translate-y-1/2 before:rounded-full before:bg-ink" />
      <span className="mx-[5px] size-3 shrink-0 animate-lay rounded-[3px] bg-paper inset-ring-2 inset-ring-ink" />
      <span className="relative h-1 flex-1 after:absolute after:top-1/2 after:right-0 after:size-2.5 after:-translate-y-1/2 after:rounded-full after:border-2 after:border-sun-ink/32 after:bg-sticky">
        <span className="absolute inset-0 overflow-hidden">
          <span className="absolute inset-y-0 -left-3 right-0 animate-march bg-[linear-gradient(90deg,var(--color-sun-ink)_55%,transparent_0)] bg-size-[12px_4px] bg-repeat-x opacity-32" />
        </span>
      </span>
    </div>
  );
}
