const { fetchYouTubeVideos } = require('../web/youtube-search');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const query = req.query?.q || (req.url && new URL(req.url, 'http://localhost').searchParams.get('q'));
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query parameter q is required.' });
  }

  try {
    const results = await fetchYouTubeVideos(query.trim());
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(results);
  } catch (error) {
    console.warn('YouTube search serverless notice:', error.message);
    return res.status(502).json({ error: 'Live YouTube search is temporarily unavailable.' });
  }
};

