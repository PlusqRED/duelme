import { BrandLink } from '@/components/identity/BrandLink';
import { PlatformIcon } from '@/components/profile/PlatformIcon';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEVELOPER_EMAIL, INSTAGRAM_URL, SITE_NAME, TELEGRAM_URL } from '@/lib/constants';

const channels = [
  { platform: 'telegram', name: 'Telegram', href: TELEGRAM_URL },
  { platform: 'instagram', name: 'Instagram', href: INSTAGRAM_URL },
] as const;

const FOOTER_LINK = 'inline-flex min-h-11 items-center text-ink underline-offset-4 hover:underline';

/** The pages that explain DuelMe, linked from every page so readers and search engines find them. */
const PAGES = [
  { href: '/how-it-works', labelKey: 'nav.howItWorks' },
  { href: '/safety', labelKey: 'nav.safety' },
  { href: '/games', labelKey: 'nav.games' },
  { href: '/about', labelKey: 'footer.about' },
  { href: '/privacy', labelKey: 'footer.privacy' },
] as const;

/**
 * The foot of every page, as the landing's demo draws it: the mark, what DuelMe is, its channels,
 * who to write to and the rights — stacked on a phone, one line from a wide screen up — over the
 * pages that explain DuelMe.
 */
export async function Footer() {
  const { t } = await getTranslation();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-page gap-2 px-gutter pt-7 pb-10 text-body-sm text-ink-3 wide:grid-cols-[auto_1fr_auto_auto_auto] wide:items-center wide:gap-7">
        <BrandLink className="w-fit" />
        <p>{t('footer.tagline')}</p>
        <ul className="-ml-2.5 flex gap-1 wide:ml-0">
          {channels.map(({ platform, name, href }) => (
            <li key={platform}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                title={name}
                className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper hover:text-ink"
              >
                <PlatformIcon platform={platform} className="size-5" />
              </a>
            </li>
          ))}
        </ul>
        <p>
          {t('footer.developer')}:{' '}
          <a href={`mailto:${DEVELOPER_EMAIL}`} className={FOOTER_LINK}>
            {DEVELOPER_EMAIL}
          </a>
        </p>
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. {t('footer.rights')}
        </p>
        <nav aria-label={t('footer.pages')} className="wide:col-span-full">
          <ul className="-ml-0.5 flex flex-wrap gap-x-6">
            {PAGES.map(({ href, labelKey }) => (
              <li key={href}>
                <LocaleLink href={href} className={FOOTER_LINK}>
                  {t(labelKey)}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
