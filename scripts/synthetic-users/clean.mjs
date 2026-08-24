#!/usr/bin/env node
// scripts/synthetic-users/clean.mjs
// Removes all generated synthetic user state files.
//
// Usage:
//   node scripts/synthetic-users/clean.mjs [--yes]
//
// Without --yes, prompts for confirmation.

import { rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getConfig } from './config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = getConfig();
  const tmpDir = config.tmpDir;

  const files = [
    'wallets.json',
    'registration-results.json',
    'verification-results.json',
    'verified-wallets.json',
  ];

  const existingFiles = files.filter((f) =>
    existsSync(resolve(tmpDir, f))
  );

  if (existingFiles.length === 0) {
    console.log('  ℹ️  No synthetic user state files found. Nothing to clean.');
    return;
  }

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  MaintChain Synthetic User Cleanup           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('  The following files will be deleted:');
  for (const f of existingFiles) {
    console.log(`    - ${resolve(tmpDir, f)}`);
  }
  console.log('');

  // Check for --yes flag
  const skipConfirmation = process.argv.includes('--yes');

  if (!skipConfirmation) {
    // In non-interactive mode (piped input), default to no
    const isInteractive = process.stdin.isTTY;
    if (!isInteractive) {
      console.log('  ⚠️  Non-interactive mode. Use --yes to confirm.');
      process.exit(1);
    }

    // Simple confirmation prompt
    process.stdout.write('  Delete these files? (y/N): ');
    const answer = await new Promise((resolve) => {
      process.stdin.setEncoding('utf-8');
      process.stdin.once('data', (data) => resolve(data.trim().toLowerCase()));
    });

    if (answer !== 'y' && answer !== 'yes') {
      console.log('  Cancelled.');
      return;
    }
  }

  for (const f of existingFiles) {
    const filePath = resolve(tmpDir, f);
    rmSync(filePath, { force: true });
    console.log(`  🗑️  Deleted: ${f}`);
  }

  console.log('');
  console.log('  ✅ Cleanup complete. All synthetic user state has been removed.');
  console.log('');
}

main().catch((err) => {
  console.error('❌ Cleanup failed:', err.message);
  process.exit(1);
});
