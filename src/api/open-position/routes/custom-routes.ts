/**
 * Custom routes for open-position JD parsing
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/open-positions/parse-jd',
      handler: 'open-position.parseJD',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/open-positions/create-from-jd',
      handler: 'open-position.createFromJD',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
