import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin-login', '/api/', '/debug', '/settings'],
    },
    sitemap: 'https://www.loftie.ai/sitemap.xml',
  };
}
