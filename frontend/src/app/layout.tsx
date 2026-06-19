import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MaintChain Decentralized Compliance',
  description: 'On-chain maintenance certification',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="flex items-center justify-between p-4 bg-slate-900 text-white">
          <div className="font-bold text-xl">MaintChain</div>
          <div className="flex gap-4">
            <a href="/" className="hover:underline">Dashboard</a>
            <a href="/upload" className="hover:underline">Upload Evidence</a>
            <a href="/approve" className="hover:underline">Approval Center</a>
            <a href="/audit" className="hover:underline">Audit Timeline</a>
          </div>
        </nav>
        <main className="p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
