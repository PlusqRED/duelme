'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  BadgeCheck,
  Boxes,
  Braces,
  ExternalLink,
  FileCode2,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_ID, DUELME_ADDRESSES } from '@/lib/constants';

const contractAddress = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];
const contractUrl = `${DEFAULT_CHAIN.explorer}/address/${contractAddress}#code`;

interface Verifiable {
  icon: LucideIcon;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}

const verifiables: Verifiable[] = [
  {
    icon: ArrowLeftRight,
    titleKey: 'trust.contract.verify1.title',
    descKey: 'trust.contract.verify1.desc',
  },
  {
    icon: Braces,
    titleKey: 'trust.contract.verify2.title',
    descKey: 'trust.contract.verify2.desc',
  },
  {
    icon: FileCode2,
    titleKey: 'trust.contract.verify3.title',
    descKey: 'trust.contract.verify3.desc',
  },
];

interface Credential {
  icon: LucideIcon;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  tone: string;
  delayClass: string;
}

const credentials: Credential[] = [
  {
    icon: ShieldCheck,
    titleKey: 'trust.cred.noncustodial.title',
    descKey: 'trust.cred.noncustodial.desc',
    tone: 'bg-emerald-500/15 text-emerald-300',
    delayClass: 'animation-delay-100',
  },
  {
    icon: BadgeCheck,
    titleKey: 'trust.cred.verified.title',
    descKey: 'trust.cred.verified.desc',
    tone: 'bg-sky-500/15 text-sky-300',
    delayClass: 'animation-delay-200',
  },
  {
    icon: Boxes,
    titleKey: 'trust.cred.oz.title',
    descKey: 'trust.cred.oz.desc',
    tone: 'bg-indigo-500/15 text-indigo-300',
    delayClass: 'animation-delay-300',
  },
  {
    icon: FlaskConical,
    titleKey: 'trust.cred.tested.title',
    descKey: 'trust.cred.tested.desc',
    tone: 'bg-violet-500/15 text-violet-300',
    delayClass: 'animation-delay-400',
  },
];

export function TrustSection() {
  const { t } = useTranslation();

  return (
    <section id="trust" className="relative overflow-hidden bg-slate-950 py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            {t('trust.eyebrow')}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white [text-wrap:balance] sm:text-4xl">
            {t('trust.title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 [text-wrap:pretty] sm:text-lg">
            {t('trust.subtitle')}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_40px_120px_-60px_rgba(99,102,241,0.65)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                {t('trust.contract.badge')}
              </span>
            </div>
            <span className="inline-flex items-center self-start rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 sm:self-auto">
              {DEFAULT_CHAIN.name}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5">
            <div className="break-all font-mono text-[13px] leading-relaxed text-slate-200 sm:text-sm">
              {contractAddress}
            </div>
          </div>

          <a
            href={contractUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('trust.contract.ctaAria')}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-950/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/50 sm:w-auto"
          >
            {t('trust.contract.cta')}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>

          <div className="mt-6 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-3">
            {verifiables.map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="flex gap-3 sm:flex-col sm:gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{t(titleKey)}</div>
                  <div className="mt-1 text-[13px] leading-relaxed text-slate-400">
                    {t(descKey)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {credentials.map(({ icon: Icon, titleKey, descKey, tone, delayClass }) => (
            <div
              key={titleKey}
              className={`card-glow animate-soft-in rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm motion-reduce:animate-none ${delayClass}`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{t(titleKey)}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
