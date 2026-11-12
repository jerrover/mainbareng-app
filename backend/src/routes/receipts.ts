import { Hono } from 'hono';
import { z } from 'zod';
import { receiptGatekeeper } from '../services/receiptGatekeeper';

export const receiptRouter = new Hono();

const verifyReceiptJsonSchema = z.object({
  image: z.string(),
  session_id: z.string().optional(),
  amount: z.number().positive().optional(),
  threshold: z.number().min(0).max(1).optional()
});

// GET /api/receipts/health
receiptRouter.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'automated-receipt-gatekeeper',
    featureId: 'FR-12',
    threshold: 0.8,
    targetLatencyMs: '30-50ms',
    supportedMimes: ['image/jpeg', 'image/png', 'image/webp']
  });
});

// POST /api/receipts/verify
receiptRouter.post('/verify', async (c) => {
  const contentType = c.req.header('content-type') || '';

  try {
    let imageBuffer: Buffer;
    let expectedAmount: number | undefined;
    let customThreshold: number | undefined;

    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['receipt'] || body['image'];

      if (!file || !(file instanceof File)) {
        return c.json(
          {
            success: false,
            error: 'MISSING_FILE',
            message: 'Berkas receipt atau image wajib disertakan dalam multipart/form-data.'
          },
          400
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);

      if (body['amount']) {
        expectedAmount = Number(body['amount']);
      }
      if (body['threshold']) {
        customThreshold = Number(body['threshold']);
      }
    } else {
      // JSON Base64 Payload
      const rawJson = await c.req.json().catch(() => null);
      if (!rawJson) {
        return c.json(
          {
            success: false,
            error: 'INVALID_JSON',
            message: 'Format request body harus berupa JSON yang valid.'
          },
          400
        );
      }

      const parseResult = verifyReceiptJsonSchema.safeParse(rawJson);
      if (!parseResult.success) {
        return c.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: parseResult.error.issues?.[0]?.message || 'Validasi payload gagal.'
          },
          400
        );
      }

      const { image, amount, threshold } = parseResult.data;
      imageBuffer = receiptGatekeeper.parseImageInput(image);
      expectedAmount = amount;
      customThreshold = threshold;
    }

    // Execute Gatekeeper Inference
    const result = await receiptGatekeeper.verifyReceipt(imageBuffer, {
      threshold: customThreshold,
      expectedAmount
    });

    if (!result.isValid) {
      return c.json(
        {
          success: false,
          error: 'INVALID_RECEIPT',
          message:
            'Gambar yang diunggah bukan bukti transfer m-banking yang valid. Silakan unggah tangkapan layar bukti transfer asli.',
          data: result
        },
        422
      );
    }

    return c.json(
      {
        success: true,
        message: 'Bukti transfer terverifikasi valid.',
        data: result
      },
      200
    );
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: 'GATEKEEPER_ERROR',
        message: err.message || 'Terjadi kesalahan saat memproses gambar.'
      },
      400
    );
  }
});
