import { app } from '../src/index';
import {
  receiptGatekeeper,
  extractImageMetadata,
  parseImageInput
} from '../src/services/receiptGatekeeper';

/**
 * Helper to generate synthetic test PNG buffers with custom dimensions & embedded metadata
 */
function createSyntheticPng(width: number, height: number, embeddedText = ''): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = Buffer.alloc(25);
  ihdrChunk.writeUInt32BE(13, 0); // length
  ihdrChunk.write('IHDR', 4, 'ascii');
  ihdrChunk.writeUInt32BE(width, 8);
  ihdrChunk.writeUInt32BE(height, 12);
  ihdrChunk[16] = 8; // bit depth
  ihdrChunk[17] = 2; // color type (RGB)
  ihdrChunk[18] = 0; // compression
  ihdrChunk[19] = 0; // filter
  ihdrChunk[20] = 0; // interlace
  ihdrChunk.writeUInt32BE(0x12345678, 21); // dummy CRC

  // Optional custom text chunk
  const textBytes = Buffer.from(embeddedText, 'utf8');
  const textChunk = Buffer.alloc(12 + textBytes.length);
  textChunk.writeUInt32BE(textBytes.length, 0);
  textChunk.write('tEXt', 4, 'ascii');
  textBytes.copy(textChunk, 8);
  textChunk.writeUInt32BE(0x87654321, 8 + textBytes.length);

  // End chunk
  const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

  return Buffer.concat([header, ihdrChunk, textChunk, iendChunk]);
}

describe('Automated Receipt Gatekeeper (FR-12 · Split-Bill)', () => {
  describe('1. Health Check Endpoint', () => {
    it('GET /api/receipts/health should return gatekeeper service specs', async () => {
      const res = await app.request('/api/receipts/health');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.service).toBe('automated-receipt-gatekeeper');
      expect(json.threshold).toBe(0.8);
      expect(json.targetLatencyMs).toBe('30-50ms');
    });
  });

  describe('2. Image Metadata & Header Parser', () => {
    it('extracts correct dimensions from PNG header', () => {
      const pngBuffer = createSyntheticPng(1080, 2400);
      const meta = extractImageMetadata(pngBuffer);

      expect(meta.format).toBe('png');
      expect(meta.width).toBe(1080);
      expect(meta.height).toBe(2400);
      expect(meta.aspectRatio).toBeCloseTo(2.22, 1);
    });

    it('throws descriptive error on non-image or corrupted buffer', () => {
      const corrupted = Buffer.from('hello world not an image at all');
      expect(() => extractImageMetadata(corrupted)).toThrow(
        'Format gambar tidak didukung. Harap unggah JPEG, PNG, atau WebP.'
      );
    });

    it('parses Base64 data URI correctly', () => {
      const pngBuffer = createSyntheticPng(400, 800);
      const base64Uri = `data:image/png;base64,${pngBuffer.toString('base64')}`;

      const parsed = parseImageInput(base64Uri);
      expect(Buffer.isBuffer(parsed)).toBe(true);
      expect(parsed.length).toBe(pngBuffer.length);
    });
  });

  describe('3. Receipt Classification & Rejection Logic', () => {
    it('approves portrait screenshot with BCA transfer signature (P >= 0.80)', async () => {
      const bcaReceiptBuffer = createSyntheticPng(
        1080,
        2340,
        'bca m-bca transfer berhasil nominal rp 50000 rekening tujuan sukses transaksi'
      );

      const result = await receiptGatekeeper.verifyReceipt(bcaReceiptBuffer);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.detectedCategory).toBe('bank_transfer_receipt');
      expect(result.bankDetected).toContain('BCA');
      expect(result.processingTimeMs).toBeLessThanOrEqual(50);
    });

    it('approves portrait screenshot with Mandiri Livin signature (P >= 0.80)', async () => {
      const mandiriReceiptBuffer = createSyntheticPng(
        1080,
        2400,
        'mandiri livin transfer rupiah transaksi sukses nominal rp 150000 pengirim penerima'
      );

      const result = await receiptGatekeeper.verifyReceipt(mandiriReceiptBuffer);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.bankDetected).toContain('Mandiri');
    });

    it('rejects landscape meme image with HTTP 422 criteria (P < 0.80)', async () => {
      // Landscape 16:9 aspect ratio typical of wallpaper, gaming meme, or random camera photo
      const landscapeMemeBuffer = createSyntheticPng(1920, 1080, 'funny cat meme funny discord reaction');

      const result = await receiptGatekeeper.verifyReceipt(landscapeMemeBuffer);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.detectedCategory).toBe('invalid_non_receipt');
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining('Orientasi lanskap')])
      );
    });

    it('rejects tiny or blank thumbnail icons', async () => {
      const tinyIconBuffer = createSyntheticPng(64, 64);

      const result = await receiptGatekeeper.verifyReceipt(tinyIconBuffer);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining('terlalu kecil')])
      );
    });
  });

  describe('4. HTTP Endpoint Integration (POST /api/receipts/verify)', () => {
    it('returns HTTP 200 OK when valid receipt is submitted via JSON Base64', async () => {
      const validBuffer = createSyntheticPng(
        1080,
        2340,
        'bca transfer berhasil nominal rp 75000 tanggal waktu rekening sukses'
      );
      const base64Str = `data:image/png;base64,${validBuffer.toString('base64')}`;

      const res = await app.request('/api/receipts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Str,
          amount: 75000
        })
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.isValid).toBe(true);
      expect(json.data.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('returns HTTP 422 Unprocessable Content when meme is submitted', async () => {
      const memeBuffer = createSyntheticPng(1280, 720, 'random meme wallpaper');
      const base64Str = memeBuffer.toString('base64');

      const res = await app.request('/api/receipts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Str
        })
      });

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('INVALID_RECEIPT');
      expect(json.message).toContain('bukan bukti transfer m-banking yang valid');
      expect(json.data.isValid).toBe(false);
    });

    it('returns HTTP 400 Bad Request when image field is missing', async () => {
      const res = await app.request('/api/receipts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 50000
        })
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('VALIDATION_ERROR');
    });

    it('returns HTTP 400 Bad Request when image buffer is corrupted', async () => {
      const res = await app.request('/api/receipts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: 'bm90IGFuIGltYWdl' // "not an image" in base64
        })
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('GATEKEEPER_ERROR');
    });
  });
});
