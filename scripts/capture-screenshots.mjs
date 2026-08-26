#!/usr/bin/env node
/**
 * Capture screenshots for Level 5 submission evidence.
 * 
 * Run: node scripts/capture-screenshots.mjs
 * 
 * Captures:
 * 1. Stellar Expert pages for each deployed contract
 * 2. Live app analytics, users, and live-network pages
 * 3. GlitchTip dashboard (requires manual login first)
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(process.cwd(), 'docs', 'evidence', 'screenshots');
mkdirSync(OUTPUT_DIR, { recursive: true });

const CONTRACTS = [
  { name: 'IdentityRegistry', id: 'CA2CSUN5T4ZJZHQ562XFHB2WVSGE2E7KS4NJ2SBFJM6CLRZIFLJP4EMC' },
  { name: 'MultiPartyApproval', id: 'CDGJ6VX3TG4M66SBFS5LCBPTF26GEFRZXXAYNYAWYRYHG2WDJ7UYAZSC' },
  { name: 'EquipmentRegistry', id: 'CBTOLJE5FVYO4Y473OIZIBX3OAAZAKCRODZ4LI56Q5UYMQTXRUSVC2EO' },
  { name: 'MaintenanceRecords', id: 'CDZ324UZJCIKG32YKY4MFZX5AO63VXCK73NO5QS3QI3256UDBYR5LP6M' },
  { name: 'ComplianceAttestation', id: 'CDDMPFXM3DMXZBMKBQR4UBSOXB5XZIDLVAJGX3L7D4C6TTFXGKY7EGU2' },
];

const APP_PAGES = [
  { name: 'analytics', url: 'https://maintchain.vercel.app/analytics' },
  { name: 'users', url: 'https://maintchain.vercel.app/users' },
  { name: 'live-network', url: 'https://maintchain.vercel.app/live-network' },
  { name: 'homepage', url: 'https://maintchain.vercel.app/' },
  { name: 'dashboard', url: 'https://maintchain.vercel.app/dashboard' },
];

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  // 1. Stellar Expert contract pages
  console.log('\n=== Capturing Stellar Expert contract pages ===');
  for (const contract of CONTRACTS) {
    const page = await context.newPage();
    const url = `https://stellar.expert/explorer/testnet/contract/${contract.id}`;
    console.log(`  ${contract.name}: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000); // Wait for JS rendering
      const filename = join(OUTPUT_DIR, `stellar-expert-${contract.name.toLowerCase()}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`  ✓ Saved: ${filename}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
    await page.close();
  }

  // 2. Live app pages
  console.log('\n=== Capturing live app pages ===');
  for (const appPage of APP_PAGES) {
    const page = await context.newPage();
    console.log(`  ${appPage.name}: ${appPage.url}`);
    try {
      await page.goto(appPage.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      const filename = join(OUTPUT_DIR, `app-${appPage.name}.png`);
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`  ✓ Saved: ${filename}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
    await page.close();
  }

  // 3. GlitchTip dashboard (requires manual auth)
  console.log('\n=== GlitchTip Dashboard ===');
  console.log('  GlitchTip requires authentication.');
  console.log('  To capture GlitchTip screenshots:');
  console.log('  1. Open https://app.glitchtip.com in your browser');
  console.log('  2. Log in to project 27052');
  console.log('  3. Navigate to Issues or Performance');
  console.log('  4. Take a screenshot and save to docs/evidence/screenshots/');
  console.log('  Expected filename: glitchtip-dashboard.png');

  await browser.close();
  console.log('\n=== Done ===');
  console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
