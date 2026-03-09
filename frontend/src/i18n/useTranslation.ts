'use client';

import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';

export function useTranslation() {
  const { t, language, setLanguage } = useContext(LanguageContext);
  return { t, language, setLanguage };
}
