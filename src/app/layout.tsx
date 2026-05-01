import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'tRetro — Aurora Liquid Glass Retro Board',
  description: 'Real-time anonymous retrospective board for agile teams. Aurora liquid-glass aesthetic.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className="h-full">
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}
