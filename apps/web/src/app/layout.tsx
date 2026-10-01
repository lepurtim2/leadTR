import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeadTR — Türkiye İşletme Veri ve İstihbarat Platformu',
  description:
    'Doğrulanmış, çok kaynaklı ve zenginleştirilmiş Türkiye firma rehberi, B2B lead istihbaratı ve mekânsal analiz motoru.',
  keywords: [
    'Türkiye firma rehberi',
    'B2B veri tabanı',
    'şirket arama',
    'lead oluşturma',
    'postgis firma arama',
    'türkiye işletme verisi',
  ],
  authors: [{ name: 'LeadTR Engineering' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
