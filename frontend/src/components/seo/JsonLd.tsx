import { SITE_NAME, SITE_URL } from '@/lib/constants';

interface JsonLdProps {
  type: 'website' | 'duel' | 'breadcrumb';
  data?: Record<string, unknown>;
}

function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'Challenge anyone to a PvP gaming duel for USDT. Create a duel, share the link, play your game, and claim your winnings.',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    creator: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function JsonLd({ type, data }: JsonLdProps) {
  let schema: Record<string, unknown>;

  switch (type) {
    case 'website':
      schema = getWebsiteSchema();
      break;
    case 'breadcrumb':
      schema = getBreadcrumbSchema(
        (data?.items as { name: string; url: string }[]) ?? []
      );
      break;
    case 'duel':
      schema = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: `DuelMe Duel #${data?.id ?? ''}`,
        description: `A PvP gaming duel for ${data?.wager ?? ''} USDT`,
        url: `${SITE_URL}/duel/${data?.id ?? ''}`,
        organizer: {
          '@type': 'Organization',
          name: SITE_NAME,
        },
      };
      break;
    default:
      schema = getWebsiteSchema();
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
