/**
 * stock-price controller
 */

import { factories } from '@strapi/strapi';
import { stockPriceService } from '../../../services/stockPrice';

export default factories.createCoreController('api::stock-price.stock-price', ({ strapi }) => ({
  async fetchLatest(ctx) {
    try {
      const { date } = ctx.query;
      console.log('📡 Manual stock price fetch triggered', date ? `for date: ${date}` : '');

      const result = await stockPriceService.fetchAndSaveStockPrice('DGXX', date as string);

      if (result) {
        ctx.body = {
          success: true,
          message: 'Stock price fetched and saved successfully',
          data: result,
        };
      } else {
        ctx.body = {
          success: false,
          message: 'No stock data returned or entry already exists',
        };
      }
    } catch (error) {
      console.error('❌ Manual fetch error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || 'Failed to fetch stock price',
      };
    }
  },
}));
