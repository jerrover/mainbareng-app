/**
 * Interactive Local Receipt Tester (FR-12)
 *
 * Usage:
 *   npx tsx scripts/testReceipt.ts [path-to-image.jpg]
 *
 * If no argument provided, it generates a demo simulated transfer receipt
 * and a demo meme to show both acceptance (200) and rejection (422).
 */

import fs from 'fs';
import path from 'path';
import { receiptGatekeeper } from '../src/services/receiptGatekeeper';

async function run() {
  const filePath = process.argv[2];

  console.log('\n==================================================');
  console.log('🔍 MABAR AUTOMATED RECEIPT GATEKEEPER (FR-12 TEST)');
  console.log('==================================================\n');

  if (filePath) {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ File tidak ditemukan: ${resolvedPath}`);
      process.exit(1);
    }

    console.log(`📁 Testing file lokal: ${resolvedPath}`);
    const buffer = fs.readFileSync(resolvedPath);

    const start = performance.now();
    try {
      const result = await receiptGatekeeper.verifyReceipt(buffer);
      const latency = (performance.now() - start).toFixed(2);

      console.log(`⏱️  Latensi Inferensi: ${latency} ms (Internal: ${result.processingTimeMs.toFixed(2)} ms)\n`);
      console.log('📊 HASIL VERIFIKASI:');
      console.log(`- Status:         ${result.isValid ? '✅ VALID (Lolos Gatekeeper)' : '❌ REJECTED (Bukan Bukti Transfer)'}`);
      console.log(`- Confidence (P): ${(result.confidence * 100).toFixed(1)}% (Threshold: 80.0%)`);
      console.log(`- Kategori:       ${result.detectedCategory}`);
      console.log(`- Bank / E-Wallet: ${result.bankDetected || 'Tidak terdeteksi spesifik'}`);
      if (result.dimensions) {
        console.log(`- Dimensi:        ${result.dimensions.width}x${result.dimensions.height}px (Aspect: ${result.dimensions.aspectRatio.toFixed(2)})`);
      }
      console.log(`- Alasan / Log:`);
      result.reasons.forEach(r => console.log(`   • ${r}`));
    } catch (err: any) {
      console.error(`❌ Error parsing gambar: ${err.message}`);
    }
    return;
  }

  // Demo Mode: Jika user tidak memberikan file path, jalankan 2 simulasi:
  console.log('ℹ️  Tidak ada file path yang diberikan. Menjalankan 2 simulasi otomatis:\n');

  // 1. Simulasi Struk Transfer BCA Asli
  console.log('--- TEST 1: Simulasi Screenshot M-Banking BCA (Portrait) ---');
  const bcaPayload = Buffer.from(
    'M-BCA TRANSFER BERHASIL\n' +
    'Tanggal: 12/11/2026 09:30:00\n' +
    'Ke Rekening: 1234567890\n' +
    'Nama: MABAR VENUE ARENA\n' +
    'Nominal: Rp 150.000,00\n' +
    'Status: TRANSAKSI BERHASIL'
  );
  const bcaPng = createDummyPng(1080, 2400, bcaPayload);
  const res1 = await receiptGatekeeper.verifyReceipt(bcaPng);
  console.log(`Status:         ${res1.isValid ? '✅ VALID' : '❌ REJECTED'}`);
  console.log(`Confidence:     ${(res1.confidence * 100).toFixed(1)}%`);
  console.log(`Kategori:       ${res1.detectedCategory}`);
  console.log(`Bank Detected:  ${res1.bankDetected}`);
  console.log(`Reasons:        ${res1.reasons.join(', ')}`);
  console.log(`Expected HTTP:  ${res1.isValid ? '200 OK' : '422 Unprocessable Content'}\n`);

  // 2. Simulasi Gambar Meme / Foto Landscape
  console.log('--- TEST 2: Simulasi Gambar Meme / Kucing (Landscape) ---');
  const memePayload = Buffer.from('LOL CAT MEME WHEN YOU CODE AT 3AM JUST FOR FUNNY MEME REDDIT');
  const memePng = createDummyPng(1200, 800, memePayload);
  const res2 = await receiptGatekeeper.verifyReceipt(memePng);
  console.log(`Status:         ${res2.isValid ? '✅ VALID' : '❌ REJECTED'}`);
  console.log(`Confidence:     ${(res2.confidence * 100).toFixed(1)}%`);
  console.log(`Kategori:       ${res2.detectedCategory}`);
  console.log(`Reasons:        ${res2.reasons.join(', ')}`);
  console.log(`Expected HTTP:  ${res2.isValid ? '200 OK' : '422 Unprocessable Content'}\n`);

  console.log('💡 TIP: Lu bisa test file gambar asli (jpg/png/webp) di laptop lu dengan jalanin:');
  console.log('   npx tsx scripts/testReceipt.ts "D:\\path\\ke\\foto-struk-transfer.jpg"\n');
}

function createDummyPng(width: number, height: number, textPayload: Buffer): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = Buffer.alloc(25);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdrChunk.writeUInt32BE(width, 8);
  ihdrChunk.writeUInt32BE(height, 12);
  ihdrChunk[16] = 8;
  ihdrChunk[17] = 2;
  ihdrChunk[18] = 0;
  ihdrChunk[19] = 0;
  ihdrChunk[20] = 0;
  ihdrChunk.writeUInt32BE(0, 21);

  const textChunkLength = textPayload.length + 5;
  const textChunk = Buffer.alloc(textChunkLength + 12);
  textChunk.writeUInt32BE(textChunkLength, 0);
  textChunk.write('tEXt', 4);
  textChunk.write('data\0', 8);
  textPayload.copy(textChunk, 13);
  textChunk.writeUInt32BE(0, textChunkLength + 8);

  const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  return Buffer.concat([signature, ihdrChunk, textChunk, iendChunk]);
}

run().catch(console.error);
