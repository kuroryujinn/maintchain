import './globals.css';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';

import Nav from '@/components/maintchain/Nav';
import RouteShell from '@/components/maintchain/RouteShell';
import SentryErrorBoundary from '@/components/maintchain/SentryErrorBoundary';
import FeedbackButton from '@/components/maintchain/FeedbackButton';
import TechnicalPreviewBanner from '@/components/maintchain/TechnicalPreviewBanner';
import { cn } from "@/lib/utils";

const geist = GeistSans;

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export const metadata = {
  title: 'MaintChain | Technical Preview — Multi-party approval on Stellar Testnet',
  description: 'A live technical preview of MaintChain\'s multi-party approval and compliance certificate system on Stellar Testnet. Test contract logic, approval flows, and on-chain verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(interTight.variable, inter.variable, jetbrainsMono.variable, "font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-screen bg-slate-100 text-slate-900`}>
        <SentryErrorBoundary>
          <Nav />
          <RouteShell>
            <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
              <div className="-mx-4 sm:-mx-6 lg:-mx-8">
                <TechnicalPreviewBanner />
              </div>
              {children}
            </main>
          </RouteShell>
        </SentryErrorBoundary>
        <FeedbackButton />
      </body>
    </html>
  );
}
