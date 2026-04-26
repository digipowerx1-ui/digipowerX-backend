/**
 * early-access router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/early-access',
      handler: 'early-access.subscribe',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
