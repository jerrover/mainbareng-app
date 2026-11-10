import app from '../src/index';

describe('Backend Baseline Integration Test', () => {
  it('should return health status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('mabar-backend');
  });

  it('should serve auth confirmed html landing page', async () => {
    const res = await app.request('/auth/confirmed');
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Email Terverifikasi');
    expect(html).toContain('mabar://login');
  });

  it('should validate missing session create payload', async () => {
    const res = await app.request('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
