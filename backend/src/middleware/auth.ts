import { Context, Next } from 'hono';
import { User } from '@supabase/supabase-js';
import { supabase } from '../db/supabase';

export interface AuthVariables {
  user: User;
  token: string;
}

export const authMiddleware = async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');

  if (!authHeader) {
    return c.json(
      {
        success: false,
        message: 'Akses ditolak: Token autentikasi tidak ditemukan.'
      },
      401
    );
  }

  if (!authHeader.startsWith('Bearer ') && authHeader !== 'Bearer') {
    return c.json(
      {
        success: false,
        message: 'Akses ditolak: Format token tidak valid. Gunakan format Bearer <token>.'
      },
      401
    );
  }

  const token = authHeader.replace(/^Bearer\s*/i, '').trim();

  if (!token) {
    return c.json(
      {
        success: false,
        message: 'Akses ditolak: Format token tidak valid (token kosong).'
      },
      401
    );
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return c.json(
        {
          success: false,
          message: 'Sesi kedaluwarsa atau token tidak valid. Silakan masuk kembali.'
        },
        401
      );
    }

    c.set('user', data.user);
    c.set('token', token);
    await next();
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: 'Gagal memverifikasi token pengguna.',
        error: err?.message
      },
      401
    );
  }
};
