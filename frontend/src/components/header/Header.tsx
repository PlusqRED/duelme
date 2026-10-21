import { HeadedSectionProvider } from '@/components/header/HeadedSectionProvider';
import { HeaderEnd } from '@/components/header/HeaderEnd';
import { NavLinks } from '@/components/header/NavLinks';
import { TopBar } from '@/components/header/TopBar';
import { BrandLink } from '@/components/identity/BrandLink';

/** The top bar on every page: home, the app's sections, and the language, the wallet and the menu. */
export function Header() {
  return (
    <TopBar>
      <div className="mx-auto flex min-h-[72px] w-full max-w-page items-center gap-4 px-gutter">
        <BrandLink />
        <HeadedSectionProvider>
          <NavLinks />
          <HeaderEnd />
        </HeadedSectionProvider>
      </div>
    </TopBar>
  );
}
