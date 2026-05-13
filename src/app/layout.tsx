import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Czanix Boilerplate — Next.js',
  description: 'Clean Architecture, App Router, SSR/SSG, SEO optimized.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
