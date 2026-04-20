const https = require('https');

const EA_HOST = 'proclubs.ea.com';

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

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const pathParts = req.query.path;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts || '');
  const queryStr = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
  const eaPath = `/api/fc/${pathStr}${queryStr}`;

  const options = {
    hostname: EA_HOST,
    port: 443,
    path: eaPath,
    method: 'GET',
    headers: EA_HEADERS
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.status(500).json({ error: e.message });
  });

  proxyReq.end();
};
