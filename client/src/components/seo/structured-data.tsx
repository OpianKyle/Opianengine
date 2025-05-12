import { FC } from 'react';
import { Helmet } from 'react-helmet';

type StructuredDataProps = {
  type: 'Organization' | 'WebSite' | 'WebPage' | 'Product' | 'FAQPage' | 'BreadcrumbList' | string;
  data: Record<string, any>;
};

/**
 * StructuredData component for adding JSON-LD structured data to pages
 * This helps search engines understand the content better and can enhance search results
 */
export const StructuredData: FC<StructuredDataProps> = ({ type, data }) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

/**
 * OrganizationStructuredData component
 * Adds organization information for rich search results
 */
export const OrganizationStructuredData: FC = () => {
  const orgData = {
    name: 'Opian Rewards',
    url: 'https://www.opianrewards.com',
    logo: 'https://www.opianrewards.com/images/logo.png',
    sameAs: [
      'https://www.facebook.com/opianrewards',
      'https://www.linkedin.com/company/opianrewards',
      'https://twitter.com/opianrewards'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+27-000-000-0000',
      contactType: 'customer service'
    }
  };

  return <StructuredData type="Organization" data={orgData} />;
};

/**
 * WebsiteStructuredData component
 * Adds website information for search engines
 */
export const WebsiteStructuredData: FC = () => {
  const websiteData = {
    name: 'Opian Rewards',
    url: 'https://www.opianrewards.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.opianrewards.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  return <StructuredData type="WebSite" data={websiteData} />;
};

export default StructuredData;