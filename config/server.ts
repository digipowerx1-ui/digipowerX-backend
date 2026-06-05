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
            console.log('🕐 STOCK FETCH & SAVE TEST STARTED');
            console.log(`⏰ Current timestamp: ${new Date().toISOString()}`);

            try {
              stockPriceService.setStrapi(strapi);

              // IMPORTANT:
              // No hardcoded date. This will test getPreviousBusinessDay()
              const result = await stockPriceService.fetchAndSaveStockPrice(
                'DGXX'
              );

              console.log(
                '📦 FETCH AND SAVE RESULT:',
                JSON.stringify(result, null, 2)
              );

              if (result) {
                console.log('✅ STOCK ENTRY CREATED SUCCESSFULLY');
              } else {
                console.log('❌ NO ENTRY CREATED');
              }
            } catch (error: any) {
              console.error('❌ TEST ERROR:', error?.message || error);
              console.error(error);
            }

            console.log('✅ FINAL TEST COMPLETED');
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