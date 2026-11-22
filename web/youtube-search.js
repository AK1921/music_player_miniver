const videoIdPattern = /^[\w-]{11}$/;

function extractSearchData(html) {
  const assignment = /(?:\bytInitialData|window\[['"]ytInitialData['"]\])\s*=\s*\{/.exec(html);
  if (!assignment) throw new Error('YouTube search data missing');

  const start = assignment.index + assignment[0].length - 1;
  let depth = 0;
  let quoted = false;
  for (let offset = start; offset < html.length; offset++) {
    const char = html[offset];
    if (quoted) {
      if (char === '\\') offset++;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      return JSON.parse(html.slice(start, offset + 1));
    }
  }
  throw new Error('YouTube search data incomplete');
}

function readText(text) {
  return typeof text === 'string' ? text :
    text?.simpleText || text?.content || text?.runs?.map(run => run.text).join('') || '';
}

function durationSeconds(label) {
  if (!/^\d{1,3}(?::\d{2}){1,2}$/.test(label)) return null;
  return label.split(':').reduce((seconds, segment) => seconds * 60 + Number(segment), 0);
}

function parseVideo(renderer, contentKind) {
  if (!renderer) return null;
  const endpoint = renderer.navigationEndpoint || renderer.onTap?.innertubeCommand;
  const youtubeId = renderer.videoId || endpoint?.watchEndpoint?.videoId || endpoint?.reelWatchEndpoint?.videoId;
  const title = readText(renderer.title || renderer.headline || renderer.overlayMetadata?.primaryText);
  if (!videoIdPattern.test(youtubeId || '') || !title) return null;
  const artist = readText(renderer.ownerText || renderer.shortBylineText || renderer.longBylineText || renderer.byline) || 'YouTube';
  const durationOverlay = renderer.thumbnailOverlays?.find(overlay => overlay.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer;
  const isLyric = /\blyrics?\b/i.test(title);
  const isLive = durationOverlay?.style === 'LIVE';
  return {
    id: `yt_${youtubeId}`,
    youtubeId,
    title,
    artist,
    artwork: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    views: readText(renderer.viewCountText || renderer.shortViewCountText || renderer.overlayMetadata?.secondaryText),
    published: readText(renderer.publishedTimeText),
    duration: durationSeconds(readText(renderer.lengthText || durationOverlay?.text)),
    type: isLyric ? 'lyric' : 'video',
    category: isLyric ? 'lyrics' : 'trending',
    resultLabel: isLive ? 'Live' : contentKind || (isLyric ? 'Lyrics' : 'Video')
  };
}

function parseYouTubeResults(html) {
  const data = extractSearchData(html);
  const searchContents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents ||
    data.contents?.singleColumnSearchResultsRenderer || data.contents;
  if (!searchContents) throw new Error('YouTube search results missing');

  const rendererKinds = {
    videoRenderer: '',
    compactVideoRenderer: '',
    videoWithContextRenderer: '',
    movieRenderer: 'Film',
    reelItemRenderer: 'Short',
    shortsLockupViewModel: 'Short'
  };
  const results = new Map();
  function visit(node) {
    if (!node || typeof node !== 'object' || results.size >= 36) return;
    for (const [key, value] of Object.entries(node)) {
      if (Object.hasOwn(rendererKinds, key)) {
        const video = parseVideo(value, rendererKinds[key]);
        if (video && !results.has(video.youtubeId)) results.set(video.youtubeId, video);
      } else visit(value);
      if (results.size >= 36) break;
    }
  }
  visit(searchContents);
  return [...results.values()];
}

async function fetchYouTubeVideos(query) {
  const params = new URLSearchParams({ search_query: query });
  let lastError;
  for (const [host, timeout] of [['www.youtube.com', 5500], ['m.youtube.com', 3000]]) {
    try {
      const response = await fetch(`https://${host}/results?${params}`, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
          'Accept-Language': 'en-IN,en;q=0.9'
        }
      });
      if (!response.ok) throw new Error(`YouTube HTTP ${response.status}`);
      return parseYouTubeResults(await response.text());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

module.exports = { fetchYouTubeVideos, parseYouTubeResults };
