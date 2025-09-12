const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const isServerless = !!process.env.VERCEL; // detect serverless env

// Puppeteer setup
let puppeteer;
let chromium;
if (isServerless) {
  puppeteer = require('puppeteer-core');
  chromium = require('@sparticuz/chromium');
} else {
  puppeteer = require('puppeteer'); // full Puppeteer for local dev
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate-limit behind proxies (Vercel)
app.set('trust proxy', 1);

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'https://web-clonerr.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Puppeteer browser instance
let browser = null;
async function initBrowser() {
  if (!browser) {
    const launchOptions = {
      headless: true,
    };

    if (isServerless) {
      launchOptions.args = chromium.args;
      launchOptions.defaultViewport = chromium.defaultViewport;
      launchOptions.executablePath = await chromium.executablePath();
    }

    browser = await puppeteer.launch(launchOptions);
  }
  return browser;
}

// Capture page
async function capturePage(url) {
  const browser = await initBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 2000)); // wait
    const html = await page.content();
    return { success: true, html, url, timestamp: new Date().toISOString() };
  } catch (err) {
    console.error('Error capturing page:', err.message);
    return { success: false, error: err.message, url };
  } finally {
    await page.close();
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Crawl endpoint
app.post('/api/crawl', async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL. Must start with http:// or https://',
    });
  }

  try {
    const result = await capturePage(url);
    if (result.success) res.json(result);
    else res.status(500).json(result);
  } catch (err) {
    console.error('Crawl error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

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
