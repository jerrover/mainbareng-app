import app from '../src/index';

describe('Profile & Auth Middleware Integration Tests', () => {
  it('should reject unauthenticated request to /api/profile/me with 401', async () => {
    const res = await app.request('/api/profile/me');
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Token autentikasi tidak ditemukan');
  });

  it('should reject request with invalid auth header format', async () => {
    const res = await app.request('/api/profile/me', {
      headers: {
        Authorization: 'Basic invalid-token'
      }
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Format token tidak valid');
  });

  it('should reject request with empty Bearer token', async () => {
    const res = await app.request('/api/profile/me', {
      headers: {
        Authorization: 'Bearer '
      }
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('token kosong');
  });

  it('should reject unauthenticated request to /api/profile/activities with 401', async () => {
    const res = await app.request('/api/profile/activities');
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Token autentikasi tidak ditemukan');
  });
});
