import express from 'express';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

/* ===== Telegram ===== */
if (!process.env.STRING_SESSION) {
  throw new Error('STRING_SESSION is missing');
}

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.STRING_SESSION);

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5
});

await client.start();

/* ===== Helper ===== */
function isInWorkingTime() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= 12 * 60 && minutes <= 18 * 60;
}

/* ===== API ===== */
app.post('/send', async (req, res) => {
  try {
    if (!isInWorkingTime()) {
      return res.status(403).json({
        ok: false,
        message: 'ยังไม่ถึงเวลาออกงาน'
      });
    }

    const screenshotPath = './timeis.png';

    /* ===== Puppeteer (iframe time.is) ===== */
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    );

    await page.setViewport({ width: 1280, height: 800 });

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 1280px;
            height: 800px;
            overflow: hidden;
            background: black;
          }
          iframe {
            width: 1280px;
            height: 800px;
            border: none;
          }
        </style>
      </head>
      <body>
        <iframe src="https://time.is/Hat_Yai"></iframe>
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'load' });

    // 🔧 แทน page.waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({ path: screenshotPath });
    await browser.close();

    /* ===== Telegram ===== */
    const now = new Date();
    
    const timeStr = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // วันที่ในรูปแบบ DD/MM/YYYY (พ.ศ.)
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const yearBE = now.getFullYear() + 543; // แปลง ค.ศ. เป็น พ.ศ.
    const dateStr = `${day}/${month}/${yearBE}`;

    const caption = `ภาคภูมิ ออกงาน วันที่ ${dateStr} เวลา ${timeStr} WFH ครับ`;
    // const groupId = '@needeiei';
    const groupId = BigInt('-4054033481');
    await client.sendFile(groupId, {
      file: screenshotPath,
      caption
    });

    fs.unlinkSync(screenshotPath);

    res.json({ ok: true, time: timeStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ===== Server ===== */
app.listen(process.env.PORT || 3000, () => {
  console.log('HTTP server running');
});