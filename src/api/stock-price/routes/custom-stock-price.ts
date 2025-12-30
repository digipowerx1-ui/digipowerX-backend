/**
 * Custom stock-price routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/stock-prices/fetch-latest',
      handler: 'stock-price.fetchLatest',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
