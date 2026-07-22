'use client';

import { useState, useRef, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { MessageSquare, X, Send, ThumbsUp, ThumbsDown, Bug } from 'lucide-react';

type FeedbackType = 'general' | 'bug' | 'feature' | 'compliment';

interface FeedbackForm {
  type: FeedbackType;
  message: string;
  email: string;
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: typeof ThumbsUp }[] = [
  { value: 'general', label: 'General', icon: MessageSquare },
  { value: 'bug', label: 'Bug report', icon: Bug },
  { value: 'feature', label: 'Feature request', icon: ThumbsUp },
  { value: 'compliment', label: 'Compliment', icon: ThumbsUp },
];

/**
 * FeedbackButton
 *
 * A floating feedback widget that appears in the bottom-right corner.
 * Submits feedback to Sentry's User Feedback API and stores it for
 * the team to review.
 *
 * Usage:
 *   <FeedbackButton />
 */
export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FeedbackForm>({
    type: 'general',
    message: '',
    email: '',
  });

  const formRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    // Delay to avoid immediate close from the button click
    const timer = setTimeout(() => window.addEventListener('click', handleClick), 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClick);
    };
  }, [isOpen]);

  const resetForm = () => {
    setForm({ type: 'general', message: '', email: '' });
    setSubmitted(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form.message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Send to Sentry's User Feedback (captures error context automatically)
      // If there's a recent error event, it will be attached
      const eventId = Sentry.captureMessage(`Feedback: ${form.type}`, {
        level: form.type === 'bug' ? 'error' : 'info',
        tags: {
          feedback_type: form.type,
          source: 'feedback-widget',
        },
        extra: {
          message: form.message,
          email: form.email || 'anonymous',
        },
      });

      // If Sentry has a DSN configured, also use the User Feedback API
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        try {
          await Sentry.captureUserFeedback({
            event_id: eventId,
            name: form.email || 'Anonymous User',
            email: form.email || 'anonymous@maintchain.app',
            comments: `[${form.type.toUpperCase()}] ${form.message}`,
          });
        } catch {
          // User Feedback API is optional — silently continue
        }
      }

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 2500);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          if (!isOpen) resetForm();
        }}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)] transition-all duration-200 hover:shadow-[0_8px_28px_rgba(37,99,235,0.5)] hover:scale-105 active:scale-95"
        aria-label={isOpen ? 'Close feedback form' : 'Open feedback form'}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </button>

      {/* Feedback form panel */}
      {isOpen && (
        <div
          ref={formRef}
          className="fixed bottom-24 right-6 z-50 w-80 animate-[fadeSlideUp_0.25s_ease-out] sm:w-96"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: '24px',
            boxShadow: '0 1px 0 rgba(255,255,255,0.95) inset, 0 16px 48px rgba(15,23,42,0.12)',
          }}
        >
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Send feedback
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-[var(--text-tertiary)] transition hover:bg-slate-100 hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              /* Success state */
              <div className="mt-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <Send className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="mt-3 text-sm font-medium text-emerald-700">
                  Thanks for your feedback!
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  It helps us improve MaintChain.
                </p>
              </div>
            ) : (
              /* Form */
              <>
                {/* Feedback type selector */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setForm((prev) => ({ ...prev, type: value }))}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                        form.type === value
                          ? 'bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
                          : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Message textarea */}
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder={
                    form.type === 'bug'
                      ? 'Describe what went wrong...'
                      : form.type === 'feature'
                        ? 'What would you like to see?'
                        : 'Share your thoughts...'
                  }
                  rows={4}
                  className="mt-4 w-full resize-none rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-glow)]"
                />

                {/* Email (optional) */}
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Your email (optional)"
                  className="mt-3 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-glow)]"
                />

                {/* Error */}
                {error && (
                  <p className="mt-2 text-xs text-red-500">{error}</p>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !form.message.trim()}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white transition-all ${
                    isSubmitting || !form.message.trim()
                      ? 'cursor-not-allowed bg-[var(--text-tertiary)]'
                      : 'bg-[var(--primary)] shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.4)] hover:-translate-y-0.5'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send feedback
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
