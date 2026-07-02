import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const SITE_URL = "https://sd-tracker.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "System Design Tracker — Track Your Study Progress",
    template: "%s | System Design Tracker",
  },
  description:
    "A free tool to track your system design study sessions. GitHub-style activity heatmap, weekly progress, streak tracking, and a social layer to keep you consistent. Built for engineers preparing for system design interviews.",
  keywords: [
    "system design tracker",
    "system design study",
    "system design interview",
    "study tracker",
    "activity heatmap",
    "leetcode tracker",
    "system design preparation",
    "software engineering interview",
    "distributed systems study",
    "study consistency tool",
    "system design progress",
    "interview prep tracker",
  ],
  authors: [{ name: "Kaushik", url: "https://github.com/kaushik-3009" }],
  creator: "Kaushik",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "System Design Tracker",
    title: "System Design Tracker — Track Your Study Progress",
    description:
      "A free tool to track your system design study sessions. GitHub-style heatmap, weekly progress, streak tracking, and social accountability.",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "System Design Tracker — Activity Heatmap",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Tracker — Track Your Study Progress",
    description:
      "GitHub-style heatmap for system design study. Track sessions, maintain streaks, follow friends.",
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "System Design Tracker",
              url: SITE_URL,
              description:
                "A free tool to track system design study sessions with GitHub-style heatmaps, weekly progress, and social accountability.",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Person",
                name: "Kaushik",
                url: "https://github.com/kaushik-3009",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
