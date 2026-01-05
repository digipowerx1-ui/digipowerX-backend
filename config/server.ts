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
      // TEST: One-time test run at 11:30 PM IST (6:00 PM UTC) - REMOVE AFTER TESTING
      '0 18 * * *': async ({ strapi }) => {
        console.log('🧪 TEST CRON: Running stock price fetch test...');
        console.log('📋 MASSIVE_API_KEY configured:', process.env.MASSIVE_API_KEY ? 'Yes' : 'No');
        console.log('🔑 API Key (first 10 chars):', process.env.MASSIVE_API_KEY ? process.env.MASSIVE_API_KEY.substring(0, 10) + '...' : 'NOT SET');
        try {
          stockPriceService.setStrapi(strapi);
          const result = await stockPriceService.fetchAndSaveStockPrice('DGXX');
          if (result) {
            console.log('✅ TEST: Stock price fetch completed, entry ID:', result.id);
          } else {
            console.warn('⚠️ TEST: Stock price fetch returned no data');
          }
        } catch (error) {
          console.error('❌ TEST ERROR:', error.message || error);
        }
      },
      // Fetch daily stock prices at 6:00 PM ET (11:00 PM UTC / 3:30 AM IST) - after NASDAQ market close
      '0 23 * * 1-5': async ({ strapi }) => {
        console.log('🕐 Running daily stock price fetch cron job...');
        console.log('📋 MASSIVE_API_KEY configured:', process.env.MASSIVE_API_KEY ? 'Yes' : 'No');
        try {
          // Set strapi instance for the service
          stockPriceService.setStrapi(strapi);
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
