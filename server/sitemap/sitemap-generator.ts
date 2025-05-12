import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { db } from '../../db';
import { products } from '../../db/schema';

/**
 * Generate sitemap.xml for better search engine indexing
 * This creates a dynamic sitemap with all important pages and dynamic content
 */
export async function generateSitemap() {
  try {
    // Create a stream to write to
    const stream = new SitemapStream({ hostname: 'https://www.opianrewards.com' });
    
    // Static pages
    const staticPages = [
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/how-it-works', changefreq: 'weekly', priority: 0.8 },
      { url: '/meet-the-team', changefreq: 'monthly', priority: 0.6 },
      { url: '/login', changefreq: 'monthly', priority: 0.5 },
      { url: '/register', changefreq: 'monthly', priority: 0.5 },
      { url: '/contact-us', changefreq: 'monthly', priority: 0.7 },
    ];
    
    // Add all static pages to the sitemap
    staticPages.forEach(page => {
      stream.write(page);
    });
    
    // Get dynamic content from database
    try {
      // Get products for product pages
      const allProducts = await db.select().from(products);
      
      // Add product pages to sitemap
      allProducts.forEach(product => {
        stream.write({
          url: `/products/${product.id}`,
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined
        });
      });
    } catch (dbError) {
      console.error('Error fetching dynamic content for sitemap:', dbError);
      // Continue with static pages if dynamic content fails
    }
    
    // End the stream
    stream.end();
    
    // Generate sitemap to XML
    const data = await streamToPromise(Readable.from(stream));
    const sitemapXml = data.toString();
    
    // Write sitemap to public directory
    const publicDir = path.join(process.cwd(), 'public');
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml);
    console.log('Sitemap generated successfully!');
    
    return sitemapXml;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}

/**
 * Schedule sitemap regeneration at regular intervals
 * @param intervalHours How often to regenerate the sitemap (in hours)
 */
export function scheduleSitemapGeneration(intervalHours = 24) {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  // Generate sitemap immediately on start
  generateSitemap().catch(err => {
    console.error('Initial sitemap generation failed:', err);
  });
  
  // Schedule regular regeneration
  setInterval(() => {
    generateSitemap().catch(err => {
      console.error('Scheduled sitemap generation failed:', err);
    });
  }, intervalMs);
}