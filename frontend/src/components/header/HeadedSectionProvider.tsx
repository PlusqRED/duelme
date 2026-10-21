'use client';

import type { ReactNode } from 'react';
import { HeadedSectionContext, useHeadedSection } from '@/hooks/useHeadedSection';

/** Holds the section a link was followed to, for the bar's links and the phone menu's alike. */
export function HeadedSectionProvider({ children }: { children: ReactNode }) {
  const headedSection = useHeadedSection();

  return <HeadedSectionContext.Provider value={headedSection}>{children}</HeadedSectionContext.Provider>;
}
