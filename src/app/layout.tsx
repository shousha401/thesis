import type { Metadata } from 'next';
import { Anton, Instrument_Serif, Inter } from 'next/font/google';
import {
  BRAND_OG,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  TAGLINES,
} from '@/config/site';
import './globals.css';

/**
 * The root layout carries only the document shell: fonts, base metadata, and
 * the body background. Page chrome is decided one level down, so the public
 * site and the admin can look nothing like each other.
 *
 * Three faces, self-hosted by next/font so there is no render-blocking request
 * to a font CDN and no layout shift:
 *   Inter            body and UI
 *   Instrument Serif editorial headlines - high contrast, magazine, not academic
 *   Anton            the condensed wordmark line only
 *
 * `display: swap` means text is readable on first paint even before the font
 * arrives. Nothing is ever invisible waiting on a webfont.
 */
const grotesk = Inter({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

const editorial = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-editorial',
  display: 'swap',
});

const condensed = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${TAGLINES.primary}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: BRAND_OG, width: 1200, height: 630, alt: `${SITE_NAME} cover art` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [BRAND_OG],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${editorial.variable} ${condensed.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
