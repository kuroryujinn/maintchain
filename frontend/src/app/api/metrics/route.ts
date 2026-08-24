// Returns basic performance metrics from the server.
// Used by GlitchTip dashboards and internal monitoring.

import { NextResponse } from 'next/server';

export async function GET() {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  return NextResponse.json({
    uptime: Math.round(uptime),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
}
