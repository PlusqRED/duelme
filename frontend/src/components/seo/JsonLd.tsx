import { serializeStructuredData, type StructuredData } from '@/lib/structuredData';

interface JsonLdProps {
  data: StructuredData;
}

/** A schema.org object for search engines, in the page's markup. */
export function JsonLd({ data }: JsonLdProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }} />;
}
