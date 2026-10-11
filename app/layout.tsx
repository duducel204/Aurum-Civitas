import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Aurum Civitas',
  description: 'Protótipo de um jogo open-source para desenvolvedores, onde código define estratégia e o mundo visualiza o impacto.',
  openGraph: {
    title: 'Aurum Civitas',
    description: 'Protótipo de um jogo open-source para desenvolvedores, onde código define estratégia e o mundo visualiza o impacto.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurum Civitas',
    description: 'Protótipo de um jogo open-source para desenvolvedores, onde código define estratégia e o mundo visualiza o impacto.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
