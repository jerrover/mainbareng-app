import fs from 'fs';
import path from 'path';
import { Hono } from 'hono';
import { z } from 'zod';
import { receiptGatekeeper, ReceiptVerificationResult } from '../services/receiptGatekeeper';

export const receiptRouter = new Hono();

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/receipts');
const HISTORY_FILE = path.join(UPLOADS_DIR, 'history.json');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface ReceiptHistoryItem {
  id: string;
  filename: string;
  url: string;
  timestamp: string;
  isValid: boolean;
  confidence: number;
  bankDetected?: string;
  category: string;
  dimensions?: { width: number; height: number; aspectRatio: number };
  reasons: string[];
  extractedSnippet?: string;
}

function getReceiptHistory(): ReceiptHistoryItem[] {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(content) || [];
  } catch {
    return [];
  }
}

function saveReceiptToHistory(
  buffer: Buffer,
  result: ReceiptVerificationResult
): ReceiptHistoryItem {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const safeDate = now.toISOString().replace(/[:.]/g, '-');
  const statusTag = result.isValid ? 'valid' : 'rejected';
  const ext = 'jpg';
  const filename = `${safeDate}_${statusTag}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filePath, buffer);

  const historyItem: ReceiptHistoryItem = {
    id: filename,
    filename,
    url: `/api/receipts/uploads/${filename}`,
    timestamp,
    isValid: result.isValid,
    confidence: result.confidence,
    bankDetected: result.bankDetected,
    category: result.detectedCategory,
    dimensions: result.dimensions,
    reasons: result.reasons,
    extractedSnippet: result.extractedSnippet
  };

  const history = getReceiptHistory();
  history.unshift(historyItem);
  const trimmed = history.slice(0, 300);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');

  return historyItem;
}

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

// GET /api/receipts/history - Get saved receipts for research & reference
receiptRouter.get('/history', (c) => {
  const history = getReceiptHistory();
  return c.json({
    success: true,
    count: history.length,
    data: history
  });
});

// GET /api/receipts/uploads/:filename - Serve saved reference photo
receiptRouter.get('/uploads/:filename', (c) => {
  const filename = path.basename(c.req.param('filename'));
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return c.text('Not found', 404);
  }

  const ext = path.extname(filename).toLowerCase();
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  if (ext === '.webp') mimeType = 'image/webp';

  const fileBuffer = fs.readFileSync(filePath);
  return c.body(fileBuffer, 200, {
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=86400'
  });
});

// GET /api/receipts/test - Interactive Visual Tester UI with Reference Gallery
receiptRouter.get('/test', (c) => {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mabar Receipt Gatekeeper Tester (FR-12)</title>
  <style>
    :root {
      --bg: #0A0B0E;
      --card: #14161C;
      --card-border: #232733;
      --accent: #D5FF40;
      --text: #F3F4F6;
      --muted: #8E95A5;
      --danger: #EF4444;
      --success: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px 16px; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 540px; }
    .header { text-align: center; margin-bottom: 24px; }
    .badge { display: inline-block; background: rgba(213,255,64,0.12); color: var(--accent); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid rgba(213,255,64,0.3); margin-bottom: 8px; }
    h1 { font-size: 20px; font-weight: 800; }
    p.sub { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .card { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
    .upload-area { border: 2px dashed #2E3444; border-radius: 12px; padding: 32px 16px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; }
    .upload-area:hover, .upload-area.dragover { border-color: var(--accent); background: rgba(213,255,64,0.03); }
    .upload-icon { font-size: 32px; margin-bottom: 8px; }
    .upload-text { font-size: 14px; font-weight: 600; color: var(--text); }
    .upload-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
    input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .preview-box { margin-top: 16px; display: none; text-align: center; }
    .preview-img { max-height: 260px; max-width: 100%; border-radius: 8px; border: 1px solid var(--card-border); }
    .btn { width: 100%; background: var(--accent); color: #0A0B0E; border: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; margin-top: 16px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .result-box { display: none; margin-top: 16px; }
    .status-banner { padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: space-between; }
    .status-valid { background: rgba(16,185,129,0.15); border: 1px solid var(--success); color: var(--success); }
    .status-invalid { background: rgba(239,68,68,0.15); border: 1px solid var(--danger); color: var(--danger); }
    .meta-row { display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; color: var(--muted); }
    .meta-val { color: var(--text); font-weight: 600; }
    .meter-bg { background: #232733; height: 8px; border-radius: 999px; margin-top: 6px; overflow: hidden; }
    .meter-fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width 0.3s; }
    .reasons-list { margin-top: 12px; padding-left: 18px; font-size: 12px; color: var(--muted); }
    .reasons-list li { margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">FR-12 · SPLIT-BILL GATEKEEPER</div>
      <h1>Verifikasi Bukti Transfer AI</h1>
      <p class="sub">Validasi otomatis m-banking sub-50ms & penolakan meme/troll upload</p>
    </div>

    <div class="card">
      <div class="upload-area" id="dropArea">
        <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp">
        <div class="upload-icon">📸</div>
        <div class="upload-text">Pilih atau Seret Foto Bukti Transfer</div>
        <div class="upload-sub">Format JPG, PNG, atau WebP (BCA, Mandiri, BRImo, Dana, QRIS, dll)</div>
      </div>

      <div class="preview-box" id="previewBox">
        <img id="previewImg" class="preview-img" alt="Preview">
      </div>

      <button id="verifyBtn" class="btn" disabled>Verifikasi Bukti Transfer</button>
    </div>

    <div class="card result-box" id="resultCard">
      <div id="statusBanner" class="status-banner"></div>

      <div style="margin-top: 16px;">
        <div class="meta-row">
          <span>Tingkat Keyakinan (Confidence)</span>
          <span id="confidenceVal" class="meta-val">0%</span>
        </div>
        <div class="meter-bg">
          <div id="meterFill" class="meter-fill" style="width: 0%;"></div>
        </div>
      </div>

      <div class="meta-row" style="margin-top: 14px;">
        <span>Provider Terdeteksi:</span>
        <span id="providerVal" class="meta-val">-</span>
      </div>

      <div class="meta-row">
        <span>Dimensi & Rasio:</span>
        <span id="dimensionVal" class="meta-val">-</span>
      </div>

      <div class="meta-row">
        <span>Latensi Inferensi:</span>
        <span id="latencyVal" class="meta-val">-</span>
      </div>

      <div style="margin-top: 14px;">
        <span style="font-size: 12px; font-weight: 700; color: var(--text);">Analisis Indikator:</span>
        <ul id="reasonsList" class="reasons-list"></ul>
      </div>

      <div style="margin-top: 14px;">
        <span style="font-size: 12px; font-weight: 700; color: var(--text);">Teks Terdeteksi AI (Snippet):</span>
        <div id="ocrSnippet" style="background: #0D0E12; border: 1px solid #232733; padding: 10px; border-radius: 8px; font-size: 11px; color: #A0AEC0; margin-top: 6px; word-break: break-word; font-family: monospace;">-</div>
      </div>
    </div>
  </div>

  <script>
    const fileInput = document.getElementById('fileInput');
    const previewBox = document.getElementById('previewBox');
    const previewImg = document.getElementById('previewImg');
    const verifyBtn = document.getElementById('verifyBtn');
    const resultCard = document.getElementById('resultCard');
    const statusBanner = document.getElementById('statusBanner');
    const confidenceVal = document.getElementById('confidenceVal');
    const meterFill = document.getElementById('meterFill');
    const providerVal = document.getElementById('providerVal');
    const dimensionVal = document.getElementById('dimensionVal');
    const latencyVal = document.getElementById('latencyVal');
    const reasonsList = document.getElementById('reasonsList');
    const ocrSnippet = document.getElementById('ocrSnippet');

    let base64Data = null;

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        base64Data = event.target.result;
        previewImg.src = base64Data;
        previewBox.style.display = 'block';
        verifyBtn.disabled = false;
        resultCard.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    verifyBtn.addEventListener('click', async () => {
      if (!base64Data) return;
      verifyBtn.disabled = true;
      verifyBtn.innerText = 'Memeriksa keaslian bukti...';

      const t0 = performance.now();
      try {
        const res = await fetch('/api/receipts/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ image: base64Data })
        });
        const clientLatency = (performance.now() - t0).toFixed(2);
        const data = await res.json();
        const gate = data.data;

        resultCard.style.display = 'block';
        if (res.status === 200 && gate.isValid) {
          statusBanner.className = 'status-banner status-valid';
          statusBanner.innerHTML = '<span>✅ BUKTI TRANSFER VALID</span><span style="font-size:12px">HTTP 200</span>';
          meterFill.style.background = 'var(--success)';
        } else {
          statusBanner.className = 'status-banner status-invalid';
          statusBanner.innerHTML = '<span>❌ BUKTI DITOLAK (NON-RECEIPT)</span><span style="font-size:12px">HTTP 422</span>';
          meterFill.style.background = 'var(--danger)';
        }

        const pct = Math.round(gate.confidence * 100);
        confidenceVal.innerText = pct + '% (Threshold: 80%)';
        meterFill.style.width = pct + '%';
        providerVal.innerText = gate.bankDetected || gate.detectedCategory || 'Pola Transaksi Nasional';

        if (gate.dimensions) {
          dimensionVal.innerText = gate.dimensions.width + 'x' + gate.dimensions.height + ' px (Aspect: ' + gate.dimensions.aspectRatio.toFixed(2) + ')';
        } else {
          dimensionVal.innerText = '-';
        }

        latencyVal.innerText = gate.processingTimeMs.toFixed(2) + ' ms (Total Client: ' + clientLatency + ' ms)';

        if (ocrSnippet) {
          ocrSnippet.innerText = gate.extractedSnippet || '(Tidak ada teks terbaca)';
        }

        reasonsList.innerHTML = '';
        (gate.reasons || []).forEach(r => {
          const li = document.createElement('li');
          li.innerText = r;
          reasonsList.appendChild(li);
        });
      } catch (err) {
        alert('Gagal menghubungi backend: ' + err.message);
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.innerText = 'Verifikasi Bukti Transfer';
      }
    });
  </script>
</body>
</html>`;
  return c.html(html);
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

    // Save image to local disk for dataset reference
    const savedReceipt = saveReceiptToHistory(imageBuffer, result);

    if (!result.isValid) {
      return c.json(
        {
          success: false,
          error: 'INVALID_RECEIPT',
          message:
            'Gambar yang diunggah bukan bukti transfer m-banking yang valid. Silakan unggah tangkapan layar bukti transfer asli.',
          data: {
            ...result,
            savedReceipt
          }
        },
        422
      );
    }

    return c.json(
      {
        success: true,
        message: 'Bukti transfer terverifikasi valid.',
        data: {
          ...result,
          savedReceipt
        }
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
