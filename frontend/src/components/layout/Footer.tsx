import { BrandLink } from '@/components/identity/BrandLink';
import { getTranslation } from '@/i18n/serverTranslation';
import { DEVELOPER_EMAIL, INSTAGRAM_URL, SITE_NAME, TELEGRAM_URL } from '@/lib/constants';

const socialLinks = [
  { name: 'Telegram', href: TELEGRAM_URL },
  { name: 'Instagram', href: INSTAGRAM_URL },
];

export async function Footer() {
  const { t } = await getTranslation();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-page gap-2 px-gutter pt-7 pb-10 text-body-sm text-ink-3">
        <BrandLink className="w-fit" />
        <p>{t('footer.tagline')}</p>
        <p>
          {t('footer.developer')}:{' '}
          <a
            href={`mailto:${DEVELOPER_EMAIL}`}
            className="inline-flex min-h-11 items-center text-ink underline-offset-4 hover:underline"
          >
            {DEVELOPER_EMAIL}
          </a>
        </p>
        <ul className="flex flex-wrap gap-x-5">
          {socialLinks.map(({ name, href }) => (
            <li key={name}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-ink underline-offset-4 hover:underline"
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
