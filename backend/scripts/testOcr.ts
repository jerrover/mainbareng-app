import { createWorker } from 'tesseract.js';
import fs from 'fs';

async function test() {
  const worker = await createWorker('ind+eng');

  const bcaBuf = fs.readFileSync('backend/scripts/sample_bca.jpg');
  const ytBuf = fs.readFileSync('backend/scripts/sample_youtube.jpg');

  async function evaluate(buf: Buffer, name: string) {
    const ocr = await worker.recognize(buf);
    const text = (ocr.data.text || '').toLowerCase();
    console.log(`\n=== EVALUATING ${name} ===`);
    console.log('OCR text preview:', text.replace(/\n/g, ' '));

    let score = 0.10;
    const reasons: string[] = [];

    // Aspect ratio (simulate portrait)
    score += 0.15;
    reasons.push('Portrait screenshot (+0.15)');

    // Negative cues
    const NEGATIVES = ['youtube', 'subscribe', 'views', 'subscriber', 'tiktok', 'reels', 'instagram'];
    const matchedNeg = NEGATIVES.filter(w => text.includes(w));
    if (matchedNeg.length > 0) {
      score -= 0.60;
      reasons.push(`Negatives detected: ${matchedNeg.join(', ')} (-0.60)`);
    }

    // Bank keywords
    const BANKS = [
      { name: 'BCA', kws: ['bca', 'm-bca', 'mybca', 'klikbca'] },
      { name: 'Mandiri', kws: ['mandiri', 'livin'] },
      { name: 'BRI', kws: ['bri', 'brimo'] },
      { name: 'BNI', kws: ['bni', 'mobile banking'] },
      { name: 'DANA', kws: ['dana'] },
      { name: 'GoPay', kws: ['gopay', 'gojek'] },
      { name: 'ShopeePay', kws: ['shopeepay', 'shopee'] }
    ];

    let foundBank = '';
    for (const b of BANKS) {
      if (b.kws.some(k => text.includes(k))) {
        foundBank = b.name;
        break;
      }
    }

    if (foundBank) {
      score += 0.35;
      reasons.push(`Bank detected: ${foundBank} (+0.35)`);
    }

    // Success status
    const SUCCESS_KWS = ['transfer berhasil', 'transaksi berhasil', 'berhasil', 'sukses', 'pembayaran berhasil'];
    if (SUCCESS_KWS.some(k => text.includes(k))) {
      score += 0.25;
      reasons.push('Transfer success status detected (+0.25)');
    }

    // Financial details
    const DETAILS = ['nominal', 'rekening', 'penerima', 'rp', 'total', 'tanggal', 'waktu'];
    const detailMatches = DETAILS.filter(k => text.includes(k));
    if (detailMatches.length >= 2) {
      score += 0.15;
      reasons.push(`Financial indicators: ${detailMatches.join(', ')} (+0.15)`);
    }

    const finalScore = Math.max(0.05, Math.min(0.99, score));
    console.log('Final Score:', (finalScore * 100).toFixed(1) + '%');
    console.log('Valid (>= 80%):', finalScore >= 0.80);
    console.log('Reasons:', reasons);
  }

  await evaluate(bcaBuf, 'Sample BCA Receipt');
  await evaluate(ytBuf, 'Sample YouTube Screenshot');

  await worker.terminate();
}

test().catch(console.error);
