'use client';

import { memo, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/components/maintchain/ui';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';
type Distance = 'sm' | 'md' | 'lg';

const translateMap: Record<Direction, Record<Distance, string>> = {
  up:    { sm: 'translate-y-3',  md: 'translate-y-6',  lg: 'translate-y-10' },
  down:  { sm: '-translate-y-3', md: '-translate-y-6', lg: '-translate-y-10' },
  left:  { sm: 'translate-x-3',  md: 'translate-x-6',  lg: 'translate-x-10' },
  right: { sm: '-translate-x-3', md: '-translate-x-6', lg: '-translate-x-10' },
  none:  { sm: '',               md: '',                lg: '' },
};

function FadeInView({
  children,
  className,
  style,
  direction = 'up',
  distance = 'md',
  duration = 400,
  delay = 0,
  once = true,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Direction the element slides in from. "none" for just a fade. */
  direction?: Direction;
  /** How far it slides. */
  distance?: Distance;
  /** Duration in ms. Keep under 300-500 for snappiness. */
  duration?: number;
  /** Stagger delay in ms. Use 60-120 for sequential children. */
  delay?: number;
  /** Only animate on first intersection. */
  once?: boolean;
  /** HTML tag to render. */
  as?: 'div' | 'section' | 'article' | 'span';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const TagName = Tag;

  return (
    <TagName
      ref={ref as any}
      className={cn(
        'transition-[opacity,transform] motion-reduce:opacity-100 motion-reduce:translate-x-0 motion-reduce:translate-y-0',
        visible
          ? 'opacity-100 translate-x-0 translate-y-0'
          : cn('opacity-0', translateMap[direction][distance]),
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      {children}
    </TagName>
  );
}

export default memo(FadeInView);
