/**
 * Local diagnostic for the DGXX daily stock-price workflow.
 *
 * Verifies that one single trading date flows unchanged through:
 *   target date → Massive API → Strapi entry → Mailchimp subject/body.
 *
 * Uses the real Massive API and the local Strapi DB. Sending an actual Mailchimp
 * email is impossible here: the API key is blanked AND NODE_ENV is 'development',
 * so sendCampaign() short-circuits twice before any network call.
 *
 * Run it under the production host timezone to reproduce the original bug:
 *   TZ=America/New_York node scripts/test-stock-date-diagnostic.js
 */
require('dotenv').config();

process.env.NODE_ENV = 'development';
process.env.MAILCHIMP_API_KEY = '';
process.env.MAILCHIMP_SERVER_PREFIX = '';

const path = require('path');
const { createStrapi } = require('@strapi/strapi');

const EXPECTED_CRON_DATE = process.env.DIAG_EXPECTED_DATE || '2026-09-15';
const HOLIDAY_DATE = '2026-09-07';
const HOLIDAY_FALLBACK_DATE = '2026-09-04';

const checks = [];
function check(name, actual, expected) {
  const ok = String(actual) === String(expected);
  checks.push({ name, actual, expected, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}: got "${actual}"${ok ? '' : ` — expected "${expected}"`}`);
}

function usDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${Number(m)}/${Number(d)}/${y}`;
}

async function main() {
  let strapi;
  try {
    console.log(`\n🌐 Host timezone for this run: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`🌐 Host UTC offset (minutes behind UTC): ${new Date().getTimezoneOffset()}`);
    console.log('🚀 Initializing Strapi locally...');
    strapi = await createStrapi({ distDir: path.resolve(__dirname, '../dist') }).load();

    const { stockPriceService } = require('../dist/src/services/stockPrice');
    const { mailchimpService } = require('../dist/src/services/mailchimp');
    stockPriceService.setStrapi(strapi);

    const subjectOf = (entry) => mailchimpService.getSubject('stock-price', entry);

    // DIAG_FORCE_CREATE=1 clears the local entry for the target date first, so the
    // afterCreate lifecycle actually fires and the Mailchimp trace is exercised.
    if (process.env.DIAG_FORCE_CREATE === '1') {
      const stale = await strapi.entityService.findMany('api::stock-price.stock-price', {
        filters: { symbol: 'DGXX', date: EXPECTED_CRON_DATE },
      });
      for (const row of stale || []) {
        await strapi.entityService.delete('api::stock-price.stock-price', row.id);
        console.log(`🧹 Deleted local entry ${row.id} for ${EXPECTED_CRON_DATE} to force a fresh create`);
      }
    }

    // ── TEST 1: the production cron path (no explicit date) ──────────────────
    console.log('\n======== TEST 1: cron path, no date argument ========');
    const r1 = await stockPriceService.fetchAndSaveStockPrice('DGXX');
    if (!r1) throw new Error('TEST 1 returned no entry');
    const d1 = String(r1.date).slice(0, 10);
    console.log(`   entry id=${r1.id} documentId=${r1.documentId} date=${r1.date}`);
    check('T1 Strapi entry date', d1, EXPECTED_CRON_DATE);
    check('T1 Mailchimp subject', subjectOf(r1), `Daily Stock Update: DGXX - ${usDate(d1)}`);

    // ── TEST 2: non-trading day → backward search ────────────────────────────
    console.log(`\n======== TEST 2: non-trading-day fallback (${HOLIDAY_DATE}) ========`);
    const r2 = await stockPriceService.fetchAndSaveStockPrice('DGXX', HOLIDAY_DATE);
    if (!r2) throw new Error('TEST 2 returned no entry');
    const d2 = String(r2.date).slice(0, 10);
    console.log(`   entry id=${r2.id} documentId=${r2.documentId} date=${r2.date}`);
    check('T2 Strapi entry date (fallback)', d2, HOLIDAY_FALLBACK_DATE);
    check('T2 Mailchimp subject matches fallback', subjectOf(r2), `Daily Stock Update: DGXX - ${usDate(d2)}`);

    // ── TEST 3: duplicate protection still reuses the same entry ─────────────
    console.log('\n======== TEST 3: duplicate protection ========');
    const r3 = await stockPriceService.fetchAndSaveStockPrice('DGXX', HOLIDAY_DATE);
    check('T3 duplicate returns same entry id', r3 && r3.id, r2.id);
    check('T3 duplicate date unchanged', String(r3.date).slice(0, 10), HOLIDAY_FALLBACK_DATE);

    // ── TEST 4: no mismatch between the Strapi date and the email dates ──────
    console.log('\n======== TEST 4: Strapi date vs rendered email dates ========');
    for (const entry of [r1, r2]) {
      const iso = String(entry.date).slice(0, 10);
      const day = Number(iso.split('-')[2]);
      const year = iso.split('-')[0];
      const bodyDate = mailchimpService.formatCalendarDate(entry.date, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const html = mailchimpService.generateStockPriceEmail(entry, 'https://digipowerx.com');
      console.log(`   ${iso} → subject "${subjectOf(entry)}" | body "${bodyDate}"`);
      check(`T4 subject date for ${iso}`, subjectOf(entry), `Daily Stock Update: ${entry.symbol} - ${usDate(iso)}`);
      check(`T4 body renders day ${day}`, bodyDate.includes(`${day}, ${year}`), 'true');
      check(`T4 body embeds that date`, html.includes(`Last Updated: ${bodyDate}`), 'true');
    }

    // ── TEST 5: existing volume fixes must survive ───────────────────────────
    console.log('\n======== TEST 5: volume integrity ========');
    console.log(`   volume=${r1.volume} (${typeof r1.volume})`);
    check('T5 volume is integer-valued', Number.isInteger(Number(r1.volume)), 'true');
    check('T5 volume is finite', Number.isFinite(Number(r1.volume)), 'true');

    console.log('\n======== SUMMARY ========');
    const failed = checks.filter((c) => !c.ok);
    console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
    if (failed.length) {
      failed.forEach((c) => console.log(`   ❌ ${c.name}: got "${c.actual}", expected "${c.expected}"`));
      process.exitCode = 1;
    } else {
      console.log('🎉 ALL CHECKS PASSED');
    }
  } catch (error) {
    console.error('❌ Diagnostic failed:', (error && error.message) || error);
    console.error(error && error.stack);
    process.exitCode = 1;
  } finally {
    if (strapi) {
      await strapi.destroy();
      console.log('🛑 Strapi shut down cleanly.');
    }
  }
}

main();
