const https = require('https');
const selectTranslation = require('../web/translation-provider');

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
            resolve({ error: 'Translation is temporarily unavailable.', success: false });
          }
        } catch (e) {
          resolve({ error: e.message, success: false });
        }
      });
      res.on('error', () => resolve({ error: 'Translation request failed.', success: false }));
    });
    request.setTimeout(8000, () => request.destroy());
    request.on('error', () => resolve({ error: 'Could not connect to translation service.', success: false }));
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const searchParams = req.query || Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  const q = searchParams.q;
  const from = searchParams.from || 'en';
  const to = searchParams.to || 'hi';

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Text q is required.' });
  }

  try {
    const result = await fetchTranslation(q.trim(), from, to);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, success: false });
  }
};

