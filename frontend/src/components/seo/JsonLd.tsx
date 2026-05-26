import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { SEO_DESCRIPTION_EN, SEO_OG_IMAGE, SOCIAL_PROFILE_URLS } from '@/lib/seo';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export type JsonLdProps =
  | { type: 'organization' }
  | { type: 'webApplication' }
  | { type: 'faq' }
  | { type: 'breadcrumb'; items: BreadcrumbItem[] }
  | { type: 'game'; name: string; slug: string; description?: string };

function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    description: SEO_DESCRIPTION_EN,
    ...(SOCIAL_PROFILE_URLS.length > 0 && { sameAs: [...SOCIAL_PROFILE_URLS] }),
  };
}

function webApplicationSchema() {
  return {
    '@type': 'WebApplication',
    '@id': `${SITE_URL}#webapp`,
    name: SITE_NAME,
    alternateName: ['Duel Me'],
    url: SITE_URL,
    description: SEO_DESCRIPTION_EN,
    applicationCategory: 'GameApplication',
    applicationSubCategory: 'PvP / Skill-Based Wagering',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript and an EVM-compatible wallet.',
    inLanguage: ['en', 'ru'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: '0% platform fee. Winner takes the full USDT pot.',
    },
    publisher: { '@id': `${SITE_URL}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/duels/recent?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

const FAQS: { q: string; a: string }[] = [
  // Bilingual block: EN entries cover the platform's core value props; RU
  // mirrors are added to surface Russian-language search phrases since the
  // initial SSR is English-only (client-side i18n). Google's FAQPage policy
  // expects matching visible Q&A on the page; until that's added, this
  // schema primarily seeds the search index rather than triggering rich
  // results.
  {
    q: 'What is DuelMe?',
    a: 'DuelMe is a peer-to-peer 1v1 gaming platform where players wager USDT in skill-based duels. The full pot is escrowed in a smart contract on Arbitrum and goes to the winner — DuelMe takes 0% fees.',
  },
  {
    q: 'How does an on-chain crypto duel work?',
    a: 'You pick a wager, share an invite link, and your opponent funds the same stake. Both deposits are locked in the DuelMe smart contract until one side claims the pot or the timeout unlocks refunds for both players.',
  },
  {
    q: 'What is the platform fee on DuelMe?',
    a: 'Zero. DuelMe charges 0% platform fee. The winner withdraws the entire USDT pot directly from the contract.',
  },
  {
    q: 'Which games can I duel for crypto on?',
    a: 'Any 1v1 skill game — CS2, Dota 2, FIFA, Fortnite, Valorant, chess, Apex Legends, Rocket League, Tekken, Mortal Kombat, and more. DuelMe is game-agnostic.',
  },
  {
    q: 'Do I need KYC to play 1v1 for USDT?',
    a: 'No. DuelMe is a non-custodial protocol — you keep your wallet, no email or ID is required to wager.',
  },
  {
    q: 'Is DuelMe custodial?',
    a: 'No. Funds live in a smart contract on Arbitrum. The DuelMe team cannot move or freeze user balances. Payouts are pull-based, claimable directly by the winner.',
  },
  {
    q: 'Что такое DuelMe? Как играть в pvp за USDT?',
    a: 'DuelMe — это платформа дуэлей 1 на 1 за USDT на блокчейне Arbitrum. Создаёшь дуэль, делишься ссылкой, оба игрока вносят ставку в смарт-контракт, и победитель забирает весь банк. Комиссия платформы — 0%.',
  },
  {
    q: 'Как работает дуэль за крипту?',
    a: 'Ты выбираешь ставку и игру, отправляешь ссылку сопернику или открываешь публичную дуэль. После того как оба внесли ставку в смарт-контракт, играете в свою игру, а потом победитель забирает банк. Если соперник не отвечает — открывается возврат.',
  },
  {
    q: 'Какая комиссия на DuelMe?',
    a: 'Ноль. Весь банк уходит победителю напрямую из смарт-контракта. Платформа DuelMe не берёт никакой комиссии и не имеет рейка.',
  },
  {
    q: 'В какие игры можно играть за USDT на DuelMe?',
    a: 'В любые 1v1 — CS2, Dota 2, FIFA, Fortnite, Valorant, шахматы, Apex Legends, Rocket League, Tekken, Mortal Kombat и т.п. Платформа не ограничивает выбор игры.',
  },
  {
    q: 'Нужен ли KYC чтобы играть pvp за крипту?',
    a: 'Нет. DuelMe — некастодиальный протокол. Кошелёк остаётся у тебя, ни почта, ни документы не требуются. Достаточно подключить кошелёк или войти через быстрый сайн-ин.',
  },
  {
    q: 'Это p2p пвп или нужно играть с ботами?',
    a: 'Это чистый p2p: ты играешь против реального соперника. Никаких ботов и казино — только дуэли между игроками со ставками в USDT.',
  },
];

function faqSchema() {
  return {
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

function gameSchema(name: string, slug: string, description?: string) {
  return {
    '@type': 'VideoGame',
    name,
    url: `${SITE_URL}/games/${slug}`,
    description: description ?? `Play ${name} 1v1 for USDT on ${SITE_NAME}.`,
    image: SEO_OG_IMAGE,
    playMode: 'MultiPlayer',
    genre: ['Competitive', 'PvP', '1v1'],
    publisher: { '@id': `${SITE_URL}#organization` },
  };
}

function buildSchema(props: JsonLdProps): Record<string, unknown> {
  switch (props.type) {
    case 'organization':
      return organizationSchema();
    case 'webApplication':
      return webApplicationSchema();
    case 'faq':
      return faqSchema();
    case 'breadcrumb':
      return breadcrumbSchema(props.items);
    case 'game':
      return gameSchema(props.name, props.slug, props.description);
  }
}

export function JsonLd(props: JsonLdProps) {
  const schema = { '@context': 'https://schema.org', ...buildSchema(props) };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
