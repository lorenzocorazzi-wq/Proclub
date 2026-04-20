const https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const testUrl = 'https://proclubs.ea.com/api/fc/clubs/overallStats?platform=common-gen5&clubIds=294157';

  const options = {
    hostname: 'proclubs.ea.com',
    port: 443,
    path: '/api/fc/clubs/overallStats?platform=common-gen5&clubIds=294157',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.ea.com/it-it/games/ea-sports-fc/clubs',
      'Origin': 'https://www.ea.com',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    }
  };

  let body = '';
  const proxyReq = https.request(options, (proxyRes) => {
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', () => {
      res.statusCode = 200;
      res.end(JSON.stringify({
        status: proxyRes.statusCode,
        headers: proxyRes.headers,
        bodyPreview: body.substring(0, 500),
        isJson: body.trim().startsWith('[') || body.trim().startsWith('{')
      }, null, 2));
    });
  });

  proxyReq.on('error', (e) => {
    res.statusCode = 200;
    res.end(JSON.stringify({ error: e.message, code: e.code }));
  });

  proxyReq.end();
};
