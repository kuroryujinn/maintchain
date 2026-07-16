'use client';

import { useMemo, useState } from 'react';

import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, FilterBar, ProfileCard } from '@/components/maintchain/ui';
import { workerSortOptions, workers } from '@/data/maintchain';

const filters = ['All', 'Manufacturing', 'Automotive', 'Energy'];

export default function WorkersPage() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState(workerSortOptions[0]);

  const visibleWorkers = useMemo(() => {
    let items = workers.filter((worker) => {
      const matchesQuery =
        worker.name.toLowerCase().includes(query.toLowerCase()) ||
        worker.specialization.toLowerCase().includes(query.toLowerCase()) ||
        worker.location.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = activeFilter === 'All' || worker.industry === activeFilter;
      return matchesQuery && matchesFilter;
    });

    if (sortBy === 'Highest trust') items = [...items].sort((a, b) => b.trustScore - a.trustScore);
    if (sortBy === 'Most experienced') items = [...items].sort((a, b) => b.verifiedRepairs - a.verifiedRepairs);
    if (sortBy === 'Fastest response') items = [...items].sort((a, b) => a.availability.localeCompare(b.availability));

    return items;
  }, [activeFilter, query, sortBy]);

  return (
    <div className="space-y-8 py-6">
      <EditorialSectionHeader
        number="02"
        title="Search proven professionals, not resumes"
        caption="Discover workers · Seeded search, filtering, and sorting make it easy to compare trust, experience, certifications, and availability."
      />

      <section className="glass p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by worker, specialization, or location"
            className="h-12 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-12 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
          >
            {workerSortOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <FilterBar items={filters} active={activeFilter} onSelect={setActiveFilter} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleWorkers.map((worker, idx) => (
            <FadeInView key={worker.slug} direction="up" distance="sm" duration={400} delay={idx * 60}>
              <ProfileCard worker={worker} glass />
            </FadeInView>
          ))}
        </div>
      </section>
    </div>
  );
}
