'use client';

import { useState, useEffect } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, StatusBadge, FilterBar } from '@/components/maintchain/ui';
import { api } from '@/lib/api';
import type { UserResponse } from '@/lib/api-types';
import {
  Users,
  Calendar,
  Wallet,
  Building2,
  UserCheck,
  Shield,
  Wrench,
  ClipboardCheck,
  SearchCheck,
} from 'lucide-react';

const ROLE_ICONS: Record<string, typeof Users> = {
  technician: Wrench,
  supervisor: ClipboardCheck,
  auditor: SearchCheck,
  owner: Shield,
  regulator: UserCheck,
};

const ROLE_COLORS: Record<string, string> = {
  technician: 'border-blue-200 bg-blue-50 text-blue-700',
  supervisor: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  auditor: 'border-purple-200 bg-purple-50 text-purple-700',
  owner: 'border-amber-200 bg-amber-50 text-amber-700',
  regulator: 'border-rose-200 bg-rose-50 text-rose-700',
};

const ROLE_FILTERS = ['All', 'Technician', 'Supervisor', 'Auditor', 'Owner', 'Regulator'];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    api.listUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const visibleUsers = users.filter((user) => {
    const matchesFilter = activeFilter === 'All' || user.role.toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.stellar_address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 py-6">
      <EditorialSectionHeader
        number="02"
        title="Registered Users &amp; Network Participants"
        caption={`Users · ${users.length} registered on the network · Track onboarding progress`}
        action={
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Users className="h-4 w-4" />
            Register Now
          </a>
        }
      />

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['technician', 'supervisor', 'auditor', 'owner'].map((role) => (
          <FadeInView key={role} direction="up" distance="sm" duration={400} className="glass p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  {role}s
                </div>
                <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                  {roleCounts[role] || 0}
                </div>
              </div>
              <div className={`rounded-full p-2 ${ROLE_COLORS[role] || 'bg-slate-100 text-slate-600'}`}>
                {(() => {
                  const Icon = ROLE_ICONS[role] || Users;
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
            </div>
          </FadeInView>
        ))}
      </div>

      {/* Search & Filter */}
      <FadeInView direction="up" distance="sm" duration={400} delay={60} className="glass p-6">
        <div className="mb-4">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, organization, or wallet address..."
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary-glow)]"
          />
        </div>
        <FilterBar items={ROLE_FILTERS} active={activeFilter} onSelect={setActiveFilter} />

        {/* Users List */}
        {loading ? (
          <div className="mt-6 text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent mx-auto" />
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading registered users...</p>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="mt-6 text-center py-12">
            <Users className="mx-auto h-12 w-12 text-[var(--text-tertiary)]" />
            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              {users.length === 0 ? 'No users registered yet' : 'No users match your search'}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {users.length === 0
                ? 'Be the first to register on MaintChain!'
                : 'Try a different search term or filter.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {visibleUsers.map((user, idx) => (
              <FadeInView
                key={user.id}
                direction="up"
                distance="sm"
                duration={400}
                delay={idx * 40}
                className="rounded-xl border border-[var(--border)] bg-white/50 p-4 transition hover:bg-white hover:border-[var(--border-glow)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl font-semibold text-sm ${
                      ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-600'
                    }`}>
                      {(() => {
                        const Icon = ROLE_ICONS[user.role] || Users;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {user.name}
                        </span>
                        <StatusBadge tone="info">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </StatusBadge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                        {user.stellar_address && (
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            {user.stellar_address.slice(0, 8)}...{user.stellar_address.slice(-6)}
                          </span>
                        )}
                        {user.organization && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {user.organization}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInView>
            ))}
          </div>
        )}
      </FadeInView>

      {/* Onboarding CTA */}
      {users.length < 50 && (
        <FadeInView direction="up" distance="sm" duration={400} delay={120} className="glass-glow-blue p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-[var(--primary)]" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            Help Us Grow the Network
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            We&apos;re targeting <strong>50+ registered users</strong> on Stellar Testnet.
            Currently at <strong>{users.length} user{users.length !== 1 ? 's' : ''}</strong>.
            Share MaintChain with your network!
          </p>
          <div className="mt-4 h-2 rounded-full bg-[var(--border)] overflow-hidden max-w-md mx-auto">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: `${Math.min(100, (users.length / 50) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            {Math.min(100, Math.round((users.length / 50) * 100))}% to 50-user goal
          </p>
        </FadeInView>
      )}
    </div>
  );
}
