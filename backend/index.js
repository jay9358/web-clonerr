const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "https://web-clonerr.vercel.app", // allow only your frontend
    methods: ["GET", "POST", "PUT", "DELETE"], // restrict methods
    allowedHeaders: ["Content-Type", "Authorization"], // headers you expect
    credentials: true
  })
);

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Puppeteer browser instance
let browser = null;
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
  return browser;
}

// Capture page with Puppeteer
async function capturePage(url) {
  const browser = await initBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(2000);
    const html = await page.content();

    return { success: true, html, url, timestamp: new Date().toISOString() };
  } catch (err) {
    console.error('Error capturing page:', err.message);
    return { success: false, error: err.message, url };
  } finally {
    await page.close();
  }
}

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Crawl endpoint
app.post('/api/crawl', async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ success: false, error: 'Invalid URL. Must start with http:// or https://' });
  }

  try {
    const result = await capturePage(url);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Crawl error:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Serve React frontend

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  if (browser) await browser.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
