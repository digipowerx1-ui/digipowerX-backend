require('dotenv').config();
const { createStrapi } = require('@strapi/strapi');
const path = require('path');

async function main() {
  let strapi;
  try {
    console.log('🚀 Initializing Strapi locally...');
    strapi = await createStrapi({ distDir: path.resolve(__dirname, '../dist') }).load();
    const { stockPriceService } = require('../dist/src/services/stockPrice');
    stockPriceService.setStrapi(strapi);

    console.log('\n====================================');
    console.log('STARTING TEST A: Known Trading Date (2026-09-04)');
    console.log('====================================');

    // Run 1: Fetch & Save to database
    console.log('--- Run 1 (Fetch & Save) ---');
    const resultA1 = await stockPriceService.fetchAndSaveStockPrice('DGXX', '2026-09-04');
    console.log('Result A1 ID:', resultA1?.id, 'Document ID:', resultA1?.documentId);

    // Run 2: Duplicate check
    console.log('\n--- Run 2 (Duplicate Protection Check) ---');
    const resultA2 = await stockPriceService.fetchAndSaveStockPrice('DGXX', '2026-09-04');
    console.log('Result A2 ID:', resultA2?.id, 'Document ID:', resultA2?.documentId);
    console.log('Duplicate check passed:', resultA1?.id === resultA2?.id ? 'YES' : 'NO');

    console.log('\n====================================');
    console.log('STARTING TEST B: Normal Service Behavior (No hardcoded date)');
    console.log('====================================');
    const resultB = await stockPriceService.fetchAndSaveStockPrice('DGXX');
    console.log('Result B ID:', resultB?.id, 'Document ID:', resultB?.documentId, 'Date:', resultB?.date);

    console.log('\n====================================');
    console.log('STARTING TEST C: Non-Trading Day Fallback (2026-09-07 Labor Day)');
    console.log('====================================');
    const resultC = await stockPriceService.fetchAndSaveStockPrice('DGXX', '2026-09-07');
    console.log('Result C ID:', resultC?.id, 'Document ID:', resultC?.documentId, 'Date:', resultC?.date);

    console.log('\n====================================');
    console.log('ALL LOCAL STOCK TESTS COMPLETED SUCCESSFULLY');
    console.log('====================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exitCode = 1;
  } finally {
    if (strapi) {
      await strapi.destroy();
      console.log('🛑 Strapi shut down cleanly.');
    }
  }
}

main();
