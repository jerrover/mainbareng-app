process.env.VERCEL = '1';
const { getRequestListener } = require('@hono/node-server');
const app = require('../src/index').default || require('../src/index');

module.exports = getRequestListener(app.fetch);
