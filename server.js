const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8765;
const EA_HOST = 'proclubs.ea.com';
const CACHE_TTL = 15 * 60 * 1000; // 15 minuti

const cache = {};

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.body;
  return null;
}

function setCache(key, body) {
  cache[key] = { body, ts: Date.now() };
}

const EA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.ea.com/it-it/games/ea-sports-fc/clubs',
  'Origin': 'https://www.ea.com',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'Connection': 'keep-alive'
};

function fetchFromEA(targetPath, callback) {
  const cached = getCached(targetPath);
  if (cached) {
    console.log(`[cache HIT] ${targetPath}`);
    return callback(null, cached);
  }

  console.log(`[fetch EA] ${targetPath}`);
  const options = {
    hostname: EA_HOST,
    port: 443,
    path: targetPath,
    method: 'GET',
    headers: EA_HEADERS
  };

  let body = '';
  const req = https.request(options, (eaRes) => {
    eaRes.on('data', chunk => body += chunk);
    eaRes.on('end', () => {
      if (eaRes.statusCode === 200 && (body.trim().startsWith('{') || body.trim().startsWith('['))) {
        setCache(targetPath, body);
      }
      callback(eaRes.statusCode, body);
    });
  });

  req.on('error', (e) => callback(null, JSON.stringify({ error: e.message })));
  req.end();
}

function sendEA(res, targetPath) {
  fetchFromEA(targetPath, (status, body) => {
    res.writeHead(status || 200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    });
    res.end(body);
  });
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' });
    res.end();
    return;
  }

  if (pathname === '/api/proxy') {
    const p = parsed.query.path || '';
    const q = Object.assign({}, parsed.query);
    delete q.path;
    const qs = Object.keys(q).length ? '?' + new url.URLSearchParams(q).toString() : '';
    sendEA(res, `/api/fc/${p}${qs}`);
    return;
  }

  if (pathname.startsWith('/api/')) {
    const eaPath = pathname.replace('/api/', '/api/fc/') + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
    sendEA(res, eaPath);
    return;
  }

  // Serve static files
  const base = path.join(__dirname);
  let filePath = pathname === '/' ? path.join(base, 'index.html') : path.join(base, pathname);
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  serveFile(res, filePath, types[ext] || 'text/plain');
});

server.listen(PORT, () => {
  console.log(`\x1b[32m✓ Server avviato su http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[33m  Cache EA attiva (TTL: 15 min)\x1b[0m`);
});
