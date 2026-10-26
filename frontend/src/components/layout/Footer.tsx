import { BrandLink } from '@/components/identity/BrandLink';
import { PlatformIcon } from '@/components/profile/PlatformIcon';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEVLOG_URL, SITE_NAME } from '@/lib/constants';

/** The pages that explain DuelMe, linked from every page so readers and search engines find them. */
const PAGES = [
  { href: '/how-it-works', labelKey: 'nav.howItWorks' },
  { href: '/safety', labelKey: 'nav.safety' },
  { href: '/games', labelKey: 'nav.games' },
  { href: '/about', labelKey: 'footer.about' },
  { href: '/privacy', labelKey: 'footer.privacy' },
] as const;

/**
 * The foot of every page, closing it the way the top bar opens it: the mark, the pages that explain
 * DuelMe as the bar's quiet links, and the devlog as a paper pill at the end, over one small line of
 * what DuelMe is and the rights. Narrower than `hero`, where the Russian page names stop fitting
 * between the mark and the pill, the devlog stays beside the mark and the pages wrap under them.
 */
export async function Footer() {
  const { t } = await getTranslation();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-page grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-gutter pt-4 pb-6 hero:grid-cols-[auto_1fr_auto] hero:pt-5">
        <BrandLink className="w-fit" />
        <nav aria-label={t('footer.pages')} className="col-span-full row-start-2 hero:col-span-1 hero:row-start-auto">
          <ul className="-mx-3 flex flex-wrap">
            {PAGES.map(({ href, labelKey }) => (
              <li key={href}>
                <LocaleLink
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-body-sm font-medium text-ink-2 transition-colors hover:bg-paper hover:text-ink"
                >
                  {t(labelKey)}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </nav>
        <a
          href={DEVLOG_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('about.contact.devlog')}
          className="inline-flex min-h-11 items-center gap-2 justify-self-end rounded-full border border-line bg-paper pr-4 pl-3 text-body-sm font-label text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          <PlatformIcon platform="telegram" className="size-5 text-ink" />
          {t('footer.devlog')}
        </a>
        <p className="col-span-full text-note text-ink-3 xs:flex xs:flex-wrap xs:justify-between xs:gap-x-6">
          <span>{t('footer.tagline')}</span>{' '}
          <span>
            © {new Date().getFullYear()} {SITE_NAME}. {t('footer.rights')}
          </span>
        </p>
      </div>
    </footer>
  );
}
