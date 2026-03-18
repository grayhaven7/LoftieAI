import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const robotoCondensed = Roboto_Condensed({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  // Base metadata — title/description/OG are overridden per-page via generateMetadata
  metadataBase: new URL("https://www.loftie.ai"),
  keywords: ["decluttering", "home staging", "AI room transformation", "interior design", "home organization", "declutter app", "room makeover AI"],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={robotoCondensed.variable}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=zodiak@400,500,400i,500i,600i,700&f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/loftie-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/loftie-logo.png" />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Loftie AI",
              "url": "https://www.loftie.ai",
              "description": "AI-powered decluttering and home staging tool. Upload a photo of your cluttered room and get a photorealistic transformation with step-by-step guidance.",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Person",
                "name": "Sejal Parekh",
                "url": "https://innovaedesigns.com",
                "jobTitle": "Professional Home Stager"
              }
            })
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
