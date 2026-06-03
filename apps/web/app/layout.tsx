import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoClaw',
  description: 'SaaS para automatización de WhatsApp, Instagram y VTEX',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={GeistSans.variable}>
      <body className={GeistSans.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
