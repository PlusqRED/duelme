import type { TranslationKey } from '@/i18n/translations';
import type { SocialPlatform } from '@/lib/profile';
import { InstagramIcon } from './icons/InstagramIcon';
import { SteamIcon } from './icons/SteamIcon';
import { TelegramIcon } from './icons/TelegramIcon';

/** Each platform's name as the screens write it. */
export const PLATFORM_NAME_KEY: Record<SocialPlatform, TranslationKey> = {
  steam: 'profile.socialLinks.steam',
  telegram: 'profile.socialLinks.telegram',
  instagram: 'profile.socialLinks.instagram',
};

const ICONS = { steam: SteamIcon, telegram: TelegramIcon, instagram: InstagramIcon } as const;

/** A platform's own logo, in the text colour. Its name is always beside it, so it is not read out. */
export function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  const Logo = ICONS[platform];
  return <Logo className={className} />;
}
