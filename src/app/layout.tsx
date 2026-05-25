import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/language-context';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'TerboXXX - Premium Digital Services',
  description: 'Premium rəqəmsal xidmətlər və alətlər. Sürətli, etibarlı, təhlükəsiz.',
  keywords: ['digital services', 'premium', 'Azerbaijan', 'terboXXX'],
  authors: [{ name: 'TerboXXX' }],
  openGraph: {
    title: 'TerboXXX - Premium Digital Services',
    description: 'Premium rəqəmsal xidmətlər və alətlər',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="az" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
