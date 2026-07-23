'use client';

import { useState } from 'react';
import FadeInView from '@/components/maintchain/FadeInView';
import { EditorialSectionHeader, StatusBadge } from '@/components/maintchain/ui';
import { useSoroban } from '@/hooks/useSoroban';
import {
  MessageSquare,
  Star,
  Send,
  Bug,
  Lightbulb,
  Heart,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const FEEDBACK_CATEGORIES = [
  { value: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-blue-600 bg-blue-100' },
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-600 bg-red-100' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-600 bg-amber-100' },
  { value: 'compliment', label: 'Compliment', icon: Heart, color: 'text-emerald-600 bg-emerald-100' },
] as const;

const STARS = [1, 2, 3, 4, 5];
const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function FeedbackPage() {
  const { isConnected, address } = useSoroban();

  const [category, setCategory] = useState<string>('general');
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please provide some feedback.');
      return;
    }
    if (rating === 0) {
      setError('Please rate your experience.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Post to the feedback API — using Sentry capture for now
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          rating,
          message: message.trim(),
          email: email.trim() || undefined,
          wallet: address,
          page_url: typeof window !== 'undefined' ? window.location.href : '',
        }),
      }).catch(() => {
        // Silent fallback — Sentry may not be configured locally
      });

      // Also try to send to Sentry's User Feedback API
      const Sentry = (await import('@sentry/nextjs')).default;
      try {
        const eventId = Sentry.captureMessage(`Feedback: ${category}`, {
          level: 'info',
          tags: { feedback_category: category, feedback_rating: String(rating) },
          extra: { message, email: email || 'anonymous', wallet: address },
        });
        Sentry.captureUserFeedback({
          event_id: eventId,
          name: email || 'Anonymous User',
          email: email || undefined,
          comments: `[${category}] Rating: ${rating}/5 — ${message}`,
        });
      } catch {
        // Sentry feedback is optional
      }

      setSubmitted(true);
    } catch {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6 px-4">
        <EditorialSectionHeader
          number="01"
          title="Thank You for Your Feedback!"
          caption="Feedback · Help us improve MaintChain"
        />
        <FadeInView direction="up" distance="sm" duration={500} className="glass p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-[var(--text-primary)]">
            Feedback Received
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Your input directly shapes the next version of MaintChain. Every submission is reviewed by the team.
          </p>

          <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-left">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-secondary)]">Category:</span>
              <StatusBadge tone="info">
                {FEEDBACK_CATEGORIES.find(c => c.value === category)?.label || category}
              </StatusBadge>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-[var(--text-secondary)]">Rating:</span>
              <div className="flex gap-0.5">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            {message && (
              <div className="mt-3 text-sm text-[var(--text-primary)]">
                &ldquo;{message}&rdquo;
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Register Now <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-8 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-white"
            >
              Back to Home
            </a>
          </div>
        </FadeInView>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6 px-4">
      <EditorialSectionHeader
        number="01"
        title="Share Your Experience"
        caption="Feedback · Your input helps us build a better compliance platform"
      />

      <FadeInView direction="up" distance="sm" duration={500} className="glass p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3">
              What type of feedback?
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FEEDBACK_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                    category === cat.value
                      ? 'border-[var(--primary)] bg-blue-50 ring-2 ring-[var(--primary-glow)]'
                      : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]'
                  }`}
                >
                  <div className={`rounded-full p-2 ${cat.color}`}>
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] text-center">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3">
              Rate your experience
            </label>
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                {STARS.map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        star <= (hoveredStar || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-[var(--text-tertiary)]'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <span className="text-sm font-semibold text-[var(--primary)]">
                  {STAR_LABELS[rating - 1]}
                </span>
              )}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
              Your Feedback
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think about MaintChain... What do you like? What could be improved?"
              rows={4}
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary-glow)]"
              required
            />
          </div>

          {/* Email (optional) */}
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2">
              Email (optional — for follow-up)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary-glow)]"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Wallet status */}
          {isConnected && address && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Connected as {address.slice(0, 8)}...{address.slice(-6)}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Feedback
              </>
            )}
          </button>

          <p className="text-center text-xs text-[var(--text-tertiary)]">
            Your feedback is anonymous unless you provide your email. We review every submission.
          </p>
        </form>
      </FadeInView>
    </div>
  );
}
