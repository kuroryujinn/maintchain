import type { ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Menu, X } from 'lucide-react';

/**
 * Documentation Layout
 *
 * This layout is SEPARATE from the main application layout.
 * It has its own navigation, sidebar, and visual hierarchy.
 * The main application's Nav component is NOT rendered here.
 */

const DOC_SECTIONS: { label: string; href: string; icon: string }[] = [
  { label: 'Overview', href: '/docs', icon: '📄' },
  { label: 'Features', href: '/docs/features', icon: '⚡' },
  { label: 'Getting Started', href: '/docs/getting-started', icon: '🚀' },
  { label: 'Architecture', href: '/docs/architecture', icon: '🏗️' },
  { label: 'Blockchain', href: '/docs/blockchain', icon: '⛓️' },
  { label: 'API Reference', href: '/docs/api', icon: '🔌' },
  { label: 'Database', href: '/docs/database', icon: '🗄️' },
  { label: 'Deployment', href: '/docs/deployment', icon: '☁️' },
  { label: 'Testing', href: '/docs/testing', icon: '🧪' },
  { label: 'Security', href: '/docs/security', icon: '🔒' },
  { label: 'Troubleshooting', href: '/docs/troubleshooting', icon: '🔧' },
  { label: 'Roadmap', href: '/docs/roadmap', icon: '🗺️' },
  { label: 'Application Routes', href: '/docs/routes', icon: '🧭' },
];

function Breadcrumbs({ path }: { path: string }) {
  const segments = path.replace('/docs', '').split('/').filter(Boolean);
  if (segments.length === 0) return null;
  const current = DOC_SECTIONS.find(s => s.href === path);
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
      <Link href="/docs" className="hover:text-slate-600 transition">Docs</Link>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">{current?.label || seg}</span>
        </span>
      ))}
    </nav>
  );
}

function PrevNextNav({ currentPath }: { currentPath: string }) {
  const allHrefs = DOC_SECTIONS.map(s => s.href);
  const idx = allHrefs.indexOf(currentPath);
  const prev = idx > 0 ? DOC_SECTIONS[idx - 1] : null;
  const next = idx < DOC_SECTIONS.length - 1 ? DOC_SECTIONS[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-200">
      {prev ? (
        <Link href={prev.href} className="group flex items-center gap-2 text-sm text-slate-500 hover:text-[#2563eb] transition">
          <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-1" />
          <span>{prev.label}</span>
        </Link>
      ) : <div />}
      {next ? (
        <Link href={next.href} className="group flex items-center gap-2 text-sm text-slate-500 hover:text-[#2563eb] transition">
          <span>{next.label}</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      ) : <div />}
    </div>
  );
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  // We can't use usePathname in a server component, so we handle active state differently.
  // The sidebar will use CSS :target or we'll pass the path via a client wrapper.
  return (
    <div className="min-h-screen" style={{ background: '#f4f6fa' }}>
      {/* Documentation Header */}
      <header
        className="sticky top-0 z-50 border-b border-slate-200"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/docs" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-[#0f172a]">MaintChain Docs</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition hidden sm:block">
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white/50 sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {DOC_SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100 hover:text-[#0f172a] transition"
              >
                <span className="text-xs">{section.icon}</span>
                <span>{section.label}</span>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <Link href="/" className="text-xs text-slate-400 hover:text-[#2563eb] transition">
              ← Back to MaintChain
            </Link>
          </div>
        </aside>

        {/* Main Documentation Content */}
        <main className="flex-1 min-w-0 px-4 py-8 sm:px-8 lg:px-12 max-w-4xl">
          {children}
        </main>
      </div>
    </div>
  );
}
