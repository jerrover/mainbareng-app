require('dotenv').config();
const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { serve } = require('@hono/node-server');

const { sessionRouter } = require('./routes/sessions');
const { venueRouter } = require('./routes/venues');

const app = new Hono();

// Global Middlewares
app.use('*', cors());

// Health Check Endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'mabar-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.route('/api/sessions', sessionRouter);
app.route('/api/venues', venueRouter);

const port = Number(process.env.PORT) || 3001;

if (process.env.NODE_ENV !== 'test') {
  console.log(`[Mabar Backend] Server listening on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port
  });
}

module.exports = app;
