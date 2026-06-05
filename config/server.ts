import { stockPriceService } from '../src/services/stockPrice';

export default ({ env }) => {
  console.log('🚀 SERVER.TS LOADED');
  console.log('🚀 CRON CONFIG LOADED');

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),

    app: {
      keys: env.array('APP_KEYS'),
    },

    cron: {
      enabled: true,

      tasks: {
        stockPriceCron: {
          task: async ({ strapi }) => {
            console.log('===================================');
            console.log('🕐 STOCK API TEST STARTED');
            console.log(`⏰ Current timestamp: ${new Date().toISOString()}`);

            try {
              stockPriceService.setStrapi(strapi);

              const stockData = await stockPriceService.fetchStockPrice('DGXX');

              console.log(
                '📊 STOCK DATA:',
                JSON.stringify(stockData, null, 2)
              );

              if (stockData) {
                console.log('✅ POLYGON API RETURNED DATA');
              } else {
                console.log('❌ NO DATA RETURNED FROM API');
              }
            } catch (error: any) {
              console.error('❌ TEST ERROR:', error?.message || error);
            }

            console.log('🕐 STOCK API TEST COMPLETED');
            console.log('===================================');
          },

          options: {
            rule: '*/2 * * * *',
          },
        },
      },
    },
  };
};