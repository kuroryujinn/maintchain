import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Documentation Landing Page
 *
 * Provides a clear index of all documentation sections.
 * Follows the MaintChain whitepaper color scheme.
 */

const SECTIONS = [
  {
    title: 'Overview',
    description: 'What is MaintChain, the problem it solves, and its core concept.',
    href: '/docs/overview',
    icon: '📄',
  },
  {
    title: 'Features',
    description: 'Complete inventory of every implemented feature with verification.',
    href: '/docs/features',
    icon: '⚡',
  },
  {
    title: 'Getting Started',
    description: 'Step-by-step guide for new users to access and use MaintChain.',
    href: '/docs/getting-started',
    icon: '🚀',
  },
  {
    title: 'Architecture',
    description: 'System design, component interactions, and data flow diagrams.',
    href: '/docs/architecture',
    icon: '🏗️',
  },
  {
    title: 'Blockchain',
    description: 'Stellar Soroban contracts, addresses, methods, and transaction lifecycle.',
    href: '/docs/blockchain',
    icon: '⛓️',
  },
  {
    title: 'API Reference',
    description: 'Complete REST API documentation with endpoints, methods, and responses.',
    href: '/docs/api',
    icon: '🔌',
  },
  {
    title: 'Database',
    description: 'PostgreSQL schema, entities, relationships, and migration history.',
    href: '/docs/database',
    icon: '🗄️',
  },
  {
    title: 'Deployment',
    description: 'Hosting, configuration, environment variables, and deployment process.',
    href: '/docs/deployment',
    icon: '☁️',
  },
  {
    title: 'Testing',
    description: 'Test suites, coverage, how to run tests, and verification results.',
    href: '/docs/testing',
    icon: '🧪',
  },
  {
    title: 'Security',
    description: 'Authentication, authorization, CORS, CSP, and secret management.',
    href: '/docs/security',
    icon: '🔒',
  },
  {
    title: 'Troubleshooting',
    description: 'Common issues and their solutions for wallet, auth, API, and deployment.',
    href: '/docs/troubleshooting',
    icon: '🔧',
  },
  {
    title: 'Roadmap',
    description: 'Implemented features versus planned milestones.',
    href: '/docs/roadmap',
    icon: '🗺️',
  },
  {
    title: 'Application Routes',
    description: 'Technical reference of every route in the MaintChain application.',
    href: '/docs/routes',
    icon: '🧭',
  },
];

export default function DocsOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight">MaintChain Documentation</h1>
        <p className="mt-3 text-base text-[#64748b] leading-relaxed max-w-2xl">
          Complete technical documentation for the MaintChain multi-party compliance platform.
          Built on Stellar Soroban smart contracts with a modern web stack.
        </p>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#2563eb]/20 to-transparent" />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group glass p-5 flex flex-col gap-2 hover:border-[#2563eb]/20 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{section.icon}</span>
              <h2 className="text-base font-semibold text-[#0f172a] group-hover:text-[#2563eb] transition">
                {section.title}
              </h2>
              <ChevronRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-[#2563eb] group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm text-[#64748b] leading-relaxed">
              {section.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Quick Links</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="text-xs text-[#2563eb] hover:underline">Live Application →</Link>
          <Link href="/docs/getting-started" className="text-xs text-[#2563eb] hover:underline">Quick Start →</Link>
          <Link href="/docs/api" className="text-xs text-[#2563eb] hover:underline">API Reference →</Link>
          <Link href="/docs/architecture" className="text-xs text-[#2563eb] hover:underline">Architecture →</Link>
        </div>
      </div>
    </div>
  );
}
