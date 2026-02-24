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
  title: "Loftie AI - Transform Your Space",
  description: "AI-powered decluttering and home styling. Upload a photo of your cluttered space and get a photorealistic vision of your transformed room with step-by-step guidance.",
  keywords: ["decluttering", "home staging", "AI", "interior design", "home organization"],
  openGraph: {
    title: "Loftie AI - Transform Your Space",
    description: "AI-powered decluttering and home styling",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Loftie AI - Transform Your Space",
      },
    ],
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
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
