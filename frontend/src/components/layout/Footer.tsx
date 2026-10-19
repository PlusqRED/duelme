'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/identity/BrandMark';
import { useTranslation } from '@/i18n/useTranslation';
import { DEVELOPER_EMAIL, INSTAGRAM_URL, SITE_NAME, TELEGRAM_URL } from '@/lib/constants';

const socialLinks = [
  { name: 'Telegram', href: TELEGRAM_URL },
  { name: 'Instagram', href: INSTAGRAM_URL },
];

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-[1240px] gap-2 px-[clamp(16px,4vw,40px)] pt-7 pb-10 text-body-sm text-ink-3">
        <Link
          href="/"
          className="inline-flex min-h-11 w-fit items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em] text-ink"
        >
          <BrandMark />
          {SITE_NAME}
        </Link>
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
