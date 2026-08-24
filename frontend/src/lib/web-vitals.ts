// Reports Core Web Vitals (LCP, INP, CLS, FCP, TTFB) to GlitchTip.
// Uses the web-vitals library for accurate measurement.

import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

function sendToGlitchTip(metric: Metric) {
  const { name, delta, id, rating } = metric;

  Sentry.withScope((scope) => {
    scope.setTag('metric_name', name);
    scope.setTag('metric_rating', rating);
    scope.setTag('web_vital', 'true');

    Sentry.captureMessage(`Web Vital: ${name} = ${Math.round(delta)}ms (${rating})`, {
      level: rating === 'poor' ? 'warning' : 'info',
      extra: {
        metric_name: name,
        metric_value: Math.round(delta),
        metric_delta: Math.round(delta),
        metric_id: id,
        metric_rating: rating,
      },
    });
  });
}

export function reportWebVitals() {
  try {
    onCLS(sendToGlitchTip);
    onINP(sendToGlitchTip);
    onLCP(sendToGlitchTip);
    onFCP(sendToGlitchTip);
    onTTFB(sendToGlitchTip);
  } catch {
    // web-vitals may not be available in all environments
  }
}
