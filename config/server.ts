export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  cron: {
    enabled: true,
    tasks: {
      // Fetch daily stock prices after market close (6 PM EST = 11 PM UTC)
      '0 23 * * 1-5': async ({ strapi }) => {
        console.log('🕐 Running daily stock price fetch cron job...');
        try {
          const { stockPriceService } = require('../src/services/stockPrice');
          await stockPriceService.fetchAndSaveStockPrice('DGXX');
          console.log('✅ Daily stock price fetch completed');
        } catch (error) {
          console.error('❌ Error in stock price cron job:', error);
        }
      },
    },
  },
});
