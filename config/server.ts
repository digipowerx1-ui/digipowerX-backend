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
      // Fetch daily stock prices at 6:00 PM ET (11:00 PM UTC / 3:30 AM IST) - after NASDAQ market close
      stockPriceCron: {
        task: async ({ strapi }) => {
          console.log('===================================');
          console.log('🕐 Running daily stock price fetch cron job...');
          console.log(`⏰ Current timestamp: ${new Date().toISOString()}`);
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
          rule: '0 18 * * 1-5',
          tz: 'America/New_York',
        },
      },
    },
  },
});