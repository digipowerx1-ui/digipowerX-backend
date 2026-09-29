/**
 * Read-only check of the Massive open-close endpoint on both hosts.
 * No Strapi, no DB writes, no Mailchimp — nothing gets saved or emailed.
 *
 *   node scripts/test-massive-open-close.mjs            # today (America/New_York)
 *   node scripts/test-massive-open-close.mjs 2026-09-28
 *
 * Reads MASSIVE_API_KEY from .env (or the shell environment).
 */
import { readFileSync } from 'node:fs';

try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const key = process.env.MASSIVE_API_KEY;
if (!key) {
  console.error('MASSIVE_API_KEY missing — put it in digipowerX-backend/.env');
  process.exit(1);
}

const date = process.argv[2] || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
console.log(`Key ending …${key.slice(-4)} | date ${date} | NY time ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}\n`);

for (const host of ['https://api.massive.com', 'https://api.polygon.io']) {
  const res = await fetch(`${host}/v1/open-close/DGXX/${date}?adjusted=true&apiKey=${key}`);
  console.log(`${host} → HTTP ${res.status}\n  ${(await res.text()).slice(0, 300)}\n`);
}
