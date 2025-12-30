export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  cron: {
    enabled: true,
    tasks: {
      // Fetch daily stock prices at 3:00 AM IST (9:30 PM UTC) - after NASDAQ market close
      '30 21 * * 1-5': async ({ strapi }) => {
        console.log('🕐 Running daily stock price fetch cron job...');
        console.log('📋 MASSIVE_API_KEY configured:', process.env.MASSIVE_API_KEY ? 'Yes' : 'No');
        try {
          const { stockPriceService } = require('../src/services/stockPrice');
          const result = await stockPriceService.fetchAndSaveStockPrice('DGXX');
          if (result) {
            console.log('✅ Daily stock price fetch completed, entry ID:', result.id);
          } else {
            console.warn('⚠️ Daily stock price fetch returned no data');
          }
        } catch (error) {
          console.error('❌ Error in stock price cron job:', error.message || error);
        }
      },
    },
  },
});
