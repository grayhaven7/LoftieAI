import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";
import "./globals.css";

const robotoCondensed = Roboto_Condensed({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Loftie AI - Transform Your Cluttered Space with AI",
  description: "Upload a photo of your cluttered room and Loftie AI instantly generates a clean, organized version with step-by-step decluttering guidance. Created by a professional home stager.",
  keywords: ["decluttering", "home staging", "AI room transformation", "interior design", "home organization", "declutter app", "room makeover AI"],
  metadataBase: new URL("https://www.loftie.ai"),
  alternates: {
    canonical: "https://www.loftie.ai",
  },
  openGraph: {
    title: "Loftie AI - Transform Your Cluttered Space with AI",
    description: "Upload a photo of your cluttered room and see it transformed in seconds. Step-by-step guidance to make it real.",
    url: "https://www.loftie.ai",
    siteName: "Loftie AI",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Loftie AI - Transform Your Space",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Loftie AI - Transform Your Cluttered Space with AI",
    description: "Upload a photo of your cluttered room and see it transformed in seconds.",
    images: ["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80"],
  },
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
      </body>
    </html>
  );
}
