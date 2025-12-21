import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loftie AI - Transform Your Space",
  description: "AI-powered decluttering and home styling. Upload a photo of your cluttered space and get a photorealistic vision of your transformed room with step-by-step guidance.",
  keywords: ["decluttering", "home staging", "AI", "interior design", "home organization"],
  openGraph: {
    title: "Loftie AI - Transform Your Space",
    description: "AI-powered decluttering and home styling",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
