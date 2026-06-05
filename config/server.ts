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
      'stockPriceCron': {
        task: async ({ strapi }) => {
          console.log('🕐 [CRON TEST STARTED]');
          console.log(`⏰ Current timestamp: ${new Date().toISOString()}`);
          console.log('✅ [CRON TEST COMPLETED]');
        },
        options: {
          rule: '*/2 * * * *',
        }
      },
    },
  },
});
