import type { ReactNode } from 'react';

export default function SectionContainer({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-7xl px-4 ${className}`}>{children}</section>
  );
}
