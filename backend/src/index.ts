import dotenv from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import { sessionRouter } from './routes/sessions';
import { venueRouter } from './routes/venues';

dotenv.config();

export const app = new Hono();

// Global Middlewares
app.use('*', cors());

// Root Landing Endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'mabar-backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      authConfirmed: '/auth/confirmed',
      venues: '/api/venues',
      sessions: '/api/sessions'
    },
    timestamp: new Date().toISOString()
  });
});

// Health Check Endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'mabar-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Email Confirmation Landing Page (Option C: Ultra-Minimal Direct)
app.get('/auth/confirmed', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Terverifikasi · Mabar</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0A0B0E;
      color: #FFFFFF;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .container {
      width: 100%;
      max-width: 360px;
      text-align: center;
      padding: 20px 0;
    }
    .check-orb {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #12141A;
      border: 1px solid #232938;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      box-shadow: 0 0 35px rgba(213, 255, 64, 0.12);
    }
    .check-orb svg {
      width: 28px;
      height: 28px;
      stroke: #D5FF40;
      stroke-width: 2.5;
      fill: none;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 8px;
      letter-spacing: -0.4px;
    }
    p {
      font-size: 13px;
      line-height: 1.6;
      color: #7D8899;
      margin-bottom: 32px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      background: #151821;
      border: 1px solid #2A3245;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      border-radius: 9999px;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
    }
    .btn:hover {
      background: #1C2230;
      border-color: #D5FF40;
      color: #D5FF40;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="check-orb">
      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <h1>Email Terverifikasi</h1>
    <p>Pendaftaran selesai. Buka aplikasi Mabar di smartphone kamu untuk melanjutkan.</p>
    <a href="mabar://login" class="btn">Buka Aplikasi Mabar</a>
  </div>
</body>
</html>`);
});

// Mount Routes
app.route('/api/sessions', sessionRouter);
app.route('/api/venues', venueRouter);

const port = Number(process.env.PORT) || 3001;

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  console.log(`[Mabar Backend] Server listening on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port
  });
}

export default app;
