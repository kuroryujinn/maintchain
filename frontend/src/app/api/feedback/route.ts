import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

interface FeedbackBody {
  category: string;
  rating: number;
  message: string;
  email?: string;
  wallet?: string | null;
  page_url?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackBody = await request.json();

    // Validate
    if (!body.message || !body.message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Log to console for now (can be extended to database storage)
    console.log('[Feedback Received]', {
      category: body.category,
      rating: body.rating,
      message: body.message.slice(0, 200),
      email: body.email?.slice(0, 80) || 'anonymous',
      wallet: body.wallet?.slice(0, 20) || 'none',
      page_url: body.page_url,
      timestamp: new Date().toISOString(),
    });

    // Capture to Sentry for error tracking / feedback aggregation
    try {
      Sentry.captureMessage('User Feedback', {
        level: 'info',
        tags: {
          feedback_category: body.category,
          feedback_rating: String(body.rating),
        },
        extra: {
          message: body.message.slice(0, 500),
          email: body.email,
          wallet_prefix: body.wallet?.slice(0, 12),
          page_url: body.page_url,
        },
      });
    } catch {
      // Sentry is optional
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Feedback received. Thank you!',
    });
  } catch (err) {
    console.error('Feedback API error:', err);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
