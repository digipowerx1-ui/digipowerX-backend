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
            console.log('🕐 [CRON TEST STARTED]');
            console.log(`⏰ Current timestamp: ${new Date().toISOString()}`);
            console.log('✅ [CRON TEST COMPLETED]');
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