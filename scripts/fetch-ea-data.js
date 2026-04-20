const https = require('https');
const fs   = require('fs');
const path = require('path');

const CLUB_ID  = '294157';
const PLATFORM = 'common-gen5';

const EA_HEADERS = {
  'User-Agent':        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':            'application/json, text/plain, */*',
  'Accept-Language':   'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer':           'https://www.ea.com/it-it/games/ea-sports-fc/clubs',
  'Origin':            'https://www.ea.com',
  'sec-ch-ua':         '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile':  '?0',
  'sec-ch-ua-platform':'"Windows"',
  'sec-fetch-dest':    'empty',
  'sec-fetch-mode':    'cors',
  'sec-fetch-site':    'same-site',
};

function fetchEA(eaPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'proclubs.ea.com',
      port:     443,
      path:     `/api/fc/${eaPath}`,
      method:   'GET',
      headers:  EA_HEADERS,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const endpoints = [
    { file: 'overall.json',  path: `clubs/overallStats?platform=${PLATFORM}&clubIds=${CLUB_ID}` },
    { file: 'members.json',  path: `members/stats?platform=${PLATFORM}&clubId=${CLUB_ID}` },
    { file: 'career.json',   path: `members/career/stats?platform=${PLATFORM}&clubId=${CLUB_ID}` },
  ];

  let allOk = true;
  for (const ep of endpoints) {
    const { status, body } = await fetchEA(ep.path);
    const isJson = body.trim().startsWith('{') || body.trim().startsWith('[');
    console.log(`${ep.file}: HTTP ${status} | JSON: ${isJson}`);

    if (status === 200 && isJson) {
      fs.writeFileSync(path.join(dataDir, ep.file), body);
      console.log(`  ✓ Salvato data/${ep.file}`);
    } else {
      console.log(`  ✗ Saltato (body preview: ${body.substring(0, 150)})`);
      allOk = false;
    }
  }

  // Scrivi il timestamp dell'ultimo aggiornamento
  fs.writeFileSync(
    path.join(dataDir, 'last-updated.json'),
    JSON.stringify({ ts: new Date().toISOString(), ok: allOk })
  );

  if (!allOk) {
    console.error('\nAlcuni endpoint hanno fallito. EA potrebbe bloccare le IP di GitHub Actions.');
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
