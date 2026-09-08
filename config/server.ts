import { stockPriceService } from '../src/services/stockPrice';

export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  cron: {
    enabled: true,
    tasks: {
      // TEMPORARY PRODUCTION CRON TEST
      // Restore normal 6 PM America/New_York schedule ('0 18 * * 1-5') after verification.
      stockPriceCron: {
        task: async ({ strapi }) => {
          console.log('===================================');
          console.log('🕐 Running DAILY STOCK PRICE CRON TEST');
          console.log(`⏰ Current timestamp: ${new Date().toISOString()}`);
          console.log('📅 Target symbol: DGXX');
          console.log('===================================');
          try {
            stockPriceService.setStrapi(strapi);
            const result = await stockPriceService.fetchAndSaveStockPrice('DGXX');
            if (result) {
              console.log('✅ Daily stock price fetch completed, entry ID:', result.id);
            } else {
              console.warn('⚠️ Daily stock price fetch returned no data');
            }
          } catch (error: any) {
            console.error('❌ Error in stock price cron job:', error?.message || error);
          }
          console.log('===================================');
        },
        options: {
          // TEMPORARY LOCAL CRON TEST: Scheduled for ~30-35 min from current IST time (1:35 PM IST on Sep 8)
          // Restore to '0 18 * * 1-5' with 'America/New_York' after test verification
          rule: '35 13 8 9 *',
          tz: 'Asia/Kolkata',
        },
      },
    },
  },
});