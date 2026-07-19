import './globals.css';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';

import Nav from '@/components/maintchain/Nav';
import RouteShell from '@/components/maintchain/RouteShell';
import { cn } from "@/lib/utils";

const geist = GeistSans;

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export const metadata = {
  title: 'MaintChain | Verifiable reputation for industrial maintenance',
  description: 'A global trust network for verified repairs, machine history, certificates, and worker reputation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(interTight.variable, inter.variable, jetbrainsMono.variable, "font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-screen bg-slate-100 text-slate-900`}>
        <Nav />
        <RouteShell>
          <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
            {children}
          </main>
        </RouteShell>
      </body>
    </html>
  );
}
