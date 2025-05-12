import { FC } from 'react';
import { Helmet } from 'react-helmet';

export interface MetaTagsProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  ogUrl?: string;
}

const siteTitle = 'Opian Rewards - Insurance & Rewards Management';
const siteDescription = 'Join Opian Rewards to access exclusive insurance packages, earn rewards points, and benefit from our referral program.';
const siteUrl = 'https://www.opianrewards.com';
const defaultOgImage = '/images/opian-og-image.jpg';

/**
 * MetaTags component for SEO optimization
 * Manages all meta tags, Open Graph, and Twitter Card tags for optimal SEO
 */
export const MetaTags: FC<MetaTagsProps> = ({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage,
  ogUrl,
}) => {
  const pageTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const pageDescription = description || siteDescription;
  const pageUrl = canonicalUrl || siteUrl;
  const imageUrl = ogImage || defaultOgImage;
  const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`;
  const pageOgUrl = ogUrl || pageUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={pageOgUrl} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
    </Helmet>
  );
};

export default MetaTags;