import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'tRetro — Aurora Liquid Glass Retro Board',
  description: 'Real-time anonymous retrospective board for agile teams. Aurora liquid-glass aesthetic.',
};

const NO_FLASH_THEME = `
(function() {
  try {
    var t = localStorage.getItem('tretro-theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
