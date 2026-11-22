// ==============================================================================
// NEXORA WEB STUDIO LOCAL HTTP SERVER (Zero Dependencies, Node.js Native)
// ==============================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const urlModule = require('url');
const { fetchYouTubeVideos } = require('./youtube-search');
const selectTranslation = require('./translation-provider');
const translateWithGoogle = require('./google-translation');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const SHARED_STORE_FILE = path.join(DATA_DIR, 'shared-store.json');
const CLOUD_TRANSLATION_KEY = process.env.GOOGLE_CLOUD_TRANSLATION_KEY?.trim();

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { }
}

function readSharedStore() {
  try {
    if (fs.existsSync(SHARED_STORE_FILE)) {
      const raw = fs.readFileSync(SHARED_STORE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed reading shared store:', e.message);
  }
  return {
    playlists: [],
    favorites: [],
    recentlyPlayed: [],
    customFolders: [],
    theme: 'frost-opal',
    customPalette: null,
    lastUpdated: new Date().toISOString()
  };
}

function writeSharedStore(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SHARED_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.warn('Failed writing shared store:', e.message);
    return false;
  }
}

function fetchTranslation(query, fromLang, toLang) {
  return new Promise((resolve) => {
    const mmUrl = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(query) + '&langpair=' + encodeURIComponent(fromLang) + '|' + encodeURIComponent(toLang);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    const request = https.get(mmUrl, options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const translation = selectTranslation(json, query, toLang);
          if (res.statusCode === 200 && translation) {
            resolve({
              translation,
              translatedText: translation,
              success: true,
              status: 'ok'
            });
          } else {
            const quota = [403, 429].includes(Number(json?.responseStatus)) || res.statusCode === 429;
            resolve({ error: quota ? 'The free translation service has reached its usage limit.' : 'Translation is unavailable. Try again shortly.', success: false });
          }
        } catch (e) {
          resolve({ error: e.message });
        }
      });
      res.on('error', () => resolve({ error: 'Translation is unavailable. Try again shortly.', success: false }));
    });
    request.setTimeout(10000, () => request.destroy());
    request.on('error', () => resolve({
      error: 'Could not reach the translation service. Try again shortly.',
      success: false,
      retryDirect: true,
    }));
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = urlModule.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/youtube-search') {
    const query = parsedUrl.query.q;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (typeof query !== 'string' || !query.trim() || query.length > 500) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Enter a search query of up to 500 characters.' }));
      return;
    }

    try {
      const results = await fetchYouTubeVideos(query.trim());
      res.writeHead(200);
      res.end(JSON.stringify(results));
    } catch (error) {
      console.warn('YouTube search unavailable:', error.cause?.code || error.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Live YouTube search is temporarily unavailable.' }));
    }
    return;
  }

  // Two-way translation API
  if (pathname === '/api/translate') {
    const { q, from = 'en', to = 'hi' } = parsedUrl.query;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const language = /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/;
    if (typeof q !== 'string' || !q.trim() || Buffer.byteLength(q.trim()) > 500 ||
      typeof from !== 'string' || typeof to !== 'string' || !language.test(from) ||
      !language.test(to) || from.toLowerCase() === to.toLowerCase()) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Enter up to 500 bytes of text and choose different languages.' }));
      return;
    }
    if (CLOUD_TRANSLATION_KEY && req.headers['sec-fetch-site'] === 'cross-site') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Open the web app to use translation.' }));
      return;
    }
    const result = CLOUD_TRANSLATION_KEY
      ? await translateWithGoogle(q.trim(), from, to, CLOUD_TRANSLATION_KEY)
      : await fetchTranslation(q.trim(), from, to);
    res.writeHead(result.success ? 200 : 502);
    res.end(JSON.stringify(result));
    return;
  }

  // Real-World Google Translate Text-To-Speech (TTS) Proxy
  if (pathname === '/api/tts') {
    const q = parsedUrl.query.q || parsedUrl.query.text;
    const tl = parsedUrl.query.tl || parsedUrl.query.lang || 'en';
    if (!q || typeof q !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing text parameter q' }));
      return;
    }
    const safeText = q.trim().slice(0, 300);
    const safeLang = String(tl).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 10);
    const ttsUrl = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + encodeURIComponent(safeLang) + '&q=' + encodeURIComponent(safeText);

    const ttsReq = https.get(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      }
    }, (ttsRes) => {
      if (ttsRes.statusCode >= 200 && ttsRes.statusCode < 300) {
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        ttsRes.pipe(res);
      } else {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'TTS upstream status ' + ttsRes.statusCode }));
      }
    });

    ttsReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'TTS service error: ' + err.message }));
    });
    ttsReq.setTimeout(8000, () => ttsReq.destroy());
    return;
  }

  // Cross-Browser Centralized Data Synchronization API
  if (pathname === '/api/sync') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
      const store = readSharedStore();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: store }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const incoming = JSON.parse(body || '{}');
          const current = readSharedStore();
          const merged = {
            playlists: incoming.playlists !== undefined ? incoming.playlists : current.playlists,
            favorites: incoming.favorites !== undefined ? incoming.favorites : current.favorites,
            recentlyPlayed: incoming.recentlyPlayed !== undefined ? incoming.recentlyPlayed : current.recentlyPlayed,
            customFolders: incoming.customFolders !== undefined ? incoming.customFolders : current.customFolders,
            theme: incoming.theme !== undefined ? incoming.theme : current.theme,
            customPalette: incoming.customPalette !== undefined ? incoming.customPalette : current.customPalette,
            lastUpdated: new Date().toISOString()
          };
          writeSharedStore(merged);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: merged }));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        }
      });
      return;
    }
  }

  const reqUrl = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER CRITICAL ERROR] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[SERVER CRITICAL ERROR] Unhandled rejection:', reason);
});

server.listen(PORT, process.env.WEB_HOST, () => {
  console.log(`\n======================================================`);
  console.log(`  🌟 NEXORA WEB STUDIO RUNNING LOCALLY!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Theme: Light Mode Studio (Frost Opal, Nordic, Champagne, Mint, Sakura)`);
  console.log(`  YouTube Engine: YouTube IFrame Player & YouTube API`);
  console.log(`  Offline Engine: IndexedDB Downloaded Media Tab`);
  console.log(`  Private Vault: Master PIN 2003 or arif`);
  console.log(`======================================================\n`);
});
