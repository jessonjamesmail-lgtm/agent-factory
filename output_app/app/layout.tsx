import './globals.css';
import Script from 'next/script';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instant Web Utilities & Calculators',
  description: 'Free browser-based calculators, converters, and developer tools.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="stripe-pro-unlock" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined' && window.location.search.includes('pro_unlocked=true')) {
              localStorage.setItem('micro_tools_pro', 'true');
              window.history.replaceState({}, '', window.location.pathname);
            }
          `}
        </Script>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
