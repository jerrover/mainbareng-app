import dotenv from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import { sessionRouter } from './routes/sessions';
import { venueRouter } from './routes/venues';
import { profileRouter } from './routes/profile';

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
      sessions: '/api/sessions',
      profile: '/api/profile'
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

// Email Confirmation Landing Page (Langui Fusion)
app.get('/auth/confirmed', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Berhasil Dikonfirmasi · Mabar</title>
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
    .card {
      background: #12141A;
      border: 1px solid #1F2430;
      border-radius: 16px;
      max-width: 420px;
      width: 100%;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(213, 255, 64, 0.12);
      border: 1px solid #D5FF40;
      color: #D5FF40;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 24px;
    }
    .icon-box {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      border: 2px solid #10B981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: #10B981;
      font-size: 28px;
      font-weight: bold;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 10px;
    }
    p {
      font-size: 13px;
      line-height: 1.6;
      color: #94A3B8;
      margin-bottom: 28px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      background-color: #D5FF40;
      color: #0A0B0E;
      font-weight: 700;
      font-size: 13px;
      text-decoration: none;
      border-radius: 8px;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .hint {
      font-size: 11px;
      color: #64748B;
      margin-top: 14px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">MABAR · UMN</div>
    <div class="icon-box">✓</div>
    <h1>Email Berhasil Dikonfirmasi</h1>
    <p>Akun Mabar kamu sudah aktif dan siap digunakan. Silakan buka aplikasi Mabar di smartphone kamu untuk mulai mencari teman mabar.</p>
    <a href="mabar://login" class="btn">Buka Aplikasi Mabar</a>
    <div class="hint">*Jika dibuka dari ponsel dengan aplikasi Mabar terpasang, tombol di atas akan langsung membukanya.</div>
  </div>
</body>
</html>`);
});

// Mount Routes
app.route('/api/sessions', sessionRouter);
app.route('/api/venues', venueRouter);
app.route('/api/profile', profileRouter);

const port = Number(process.env.PORT) || 3001;

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  console.log(`[Mabar Backend] Server listening on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port
  });
}

export default app;
