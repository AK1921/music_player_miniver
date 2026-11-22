// ==============================================================================
// AK YOUTUBE MUSIC & VIDEO SERVICE
// Live YouTube Scraper + Free YouTube API + Multi-Source Fallback + Curated Catalog
// Designed for high-resilience playback & search in mobile Android app
// ==============================================================================

import curatedCatalogData from './curatedCatalog.json';

const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

export interface YouTubeTrack {
  id: string; // Unique ID, e.g. yt_4NRXx6U8ABQ
  youtubeId: string; // 11-char YouTube Video ID
  title: string;
  artist: string;
  duration?: number; // in seconds
  artwork: string; // thumbnail URL
  url: string; // youtube watch URL
  views?: string;
  published?: string;
  category?: string;
  type: 'video' | 'lyric';
  moods?: string[];
  lyrics?: { time: number; text: string }[];
}

// 45 Verified playable curated tracks loaded directly from catalog
export const CURATED_YOUTUBE_CATALOG: YouTubeTrack[] = (curatedCatalogData as any[]).map(t => ({
  id: t.id || `yt_${t.youtubeId}`,
  youtubeId: t.youtubeId,
  title: t.title,
  artist: t.artist || 'YouTube Music',
  duration: t.duration || 210,
  artwork: t.artwork || `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`,
  url: `https://www.youtube.com/watch?v=${t.youtubeId}`,
  views: t.views || '1M+ views',
  published: t.year || '2024',
  category: t.category || 'trending',
  type: t.type === 'lyric' ? 'lyric' : 'video',
  moods: t.moods || ['all', 'trending'],
  lyrics: t.lyrics || [],
}));

// In-memory search cache for instant response on repeated queries
const searchCache = new Map<string, { timestamp: number; results: YouTubeTrack[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function readText(text: any): string {
  if (typeof text === 'string') return text;
  return text?.simpleText || text?.content || text?.runs?.map((run: any) => run.text).join('') || '';
}

function parseDurationSeconds(label: string): number | undefined {
  if (!label || !/^\d{1,3}(?::\d{2}){1,2}$/.test(label)) return undefined;
  return label.split(':').reduce((seconds, segment) => seconds * 60 + Number(segment), 0);
}

function extractYtInitialData(html: string): any {
  const assignment = /(?:\bytInitialData|window\[['"]ytInitialData['"]\])\s*=\s*\{/.exec(html);
  if (!assignment) throw new Error('ytInitialData not found in YouTube response');

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
  throw new Error('ytInitialData JSON incomplete');
}

function parseVideoRenderer(renderer: any): YouTubeTrack | null {
  if (!renderer) return null;
  const endpoint = renderer.navigationEndpoint || renderer.onTap?.innertubeCommand;
  const youtubeId =
    renderer.videoId ||
    endpoint?.watchEndpoint?.videoId ||
    endpoint?.reelWatchEndpoint?.videoId;

  if (!youtubeId || !VIDEO_ID_PATTERN.test(youtubeId)) return null;

  const rawTitle = readText(renderer.title || renderer.headline || renderer.overlayMetadata?.primaryText);
  if (!rawTitle) return null;

  const title = rawTitle
    .replace(/\s*\[(?:Official|Audio|Video|Lyrics?|Music Video|4K|HD|Full Song).*?\]/gi, '')
    .replace(/\s*\((?:Official|Audio|Video|Lyrics?|Music Video|4K|HD|Full Song).*?\)/gi, '')
    .trim() || rawTitle;

  const artist =
    readText(renderer.ownerText || renderer.shortBylineText || renderer.longBylineText || renderer.byline) ||
    'YouTube';

  const durationOverlay = renderer.thumbnailOverlays?.find(
    (overlay: any) => overlay.thumbnailOverlayTimeStatusRenderer
  )?.thumbnailOverlayTimeStatusRenderer;

  const rawDuration = readText(renderer.lengthText || durationOverlay?.text);
  const duration = parseDurationSeconds(rawDuration);

  const views = readText(
    renderer.viewCountText || renderer.shortViewCountText || renderer.overlayMetadata?.secondaryText
  );
  const published = readText(renderer.publishedTimeText);
  const isLyric = /\blyrics?\b/i.test(rawTitle);

  return {
    id: `yt_${youtubeId}`,
    youtubeId,
    title,
    artist,
    artwork: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${youtubeId}`,
    views: views || undefined,
    published: published || undefined,
    duration,
    category: isLyric ? 'lyrics' : 'trending',
    type: isLyric ? 'lyric' : 'video',
    moods: ['all'],
  };
}

function parseYouTubeResultsHtml(html: string): YouTubeTrack[] {
  const data = extractYtInitialData(html);
  const searchContents =
    data.contents?.twoColumnSearchResultsRenderer?.primaryContents ||
    data.contents?.singleColumnSearchResultsRenderer ||
    data.contents;

  if (!searchContents) return [];

  const rendererKinds = new Set([
    'videoRenderer',
    'compactVideoRenderer',
    'videoWithContextRenderer',
    'movieRenderer',
    'reelItemRenderer',
    'shortsLockupViewModel',
  ]);

  const results = new Map<string, YouTubeTrack>();

  function visit(node: any) {
    if (!node || typeof node !== 'object' || results.size >= 40) return;
    for (const [key, value] of Object.entries(node)) {
      if (rendererKinds.has(key)) {
        const video = parseVideoRenderer(value);
        if (video && !results.has(video.youtubeId)) {
          results.set(video.youtubeId, video);
        }
      } else {
        visit(value);
      }
      if (results.size >= 40) break;
    }
  }

  visit(searchContents);
  return Array.from(results.values());
}

/**
 * Fetch live YouTube search directly from YouTube web
 */
async function fetchDirectYouTube(query: string): Promise<YouTubeTrack[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
      'Accept-Language': 'en-IN,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube responded with HTTP ${response.status}`);
  }

  const html = await response.text();
  const tracks = parseYouTubeResultsHtml(html);
  if (tracks.length === 0) {
    throw new Error('No tracks parsed from YouTube response');
  }
  return tracks;
}

/**
 * Fetch from local studio server endpoint if app is running in dev on same WiFi
 */
async function fetchLocalStudioSearch(query: string): Promise<YouTubeTrack[]> {
  const endpoints = [
    `http://192.168.29.208:3000/api/youtube-search?q=${encodeURIComponent(query)}`,
    `http://10.0.2.2:3000/api/youtube-search?q=${encodeURIComponent(query)}`, // Android Emulator
    `http://localhost:3000/api/youtube-search?q=${encodeURIComponent(query)}`,
  ];

  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(ep, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((t: any) => ({
            id: t.id || `yt_${t.youtubeId}`,
            youtubeId: t.youtubeId,
            title: t.title,
            artist: t.artist || 'YouTube',
            artwork: t.artwork || `https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${t.youtubeId}`,
            duration: t.duration,
            views: t.views,
            published: t.published,
            category: t.category || 'trending',
            type: t.type === 'lyric' ? 'lyric' : 'video',
            moods: ['all'],
          }));
        }
      }
    } catch (_) {}
  }
  throw new Error('Local studio search unavailable');
}

/**
 * Filter curated catalog by terms
 */
function searchCuratedCatalog(query: string): YouTubeTrack[] {
  if (!query || !query.trim()) return CURATED_YOUTUBE_CATALOG;
  const qLower = query.toLowerCase().trim();
  const STOP_WORDS = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'by', 'song', 'songs', 'video', 'videos', 'music', 'official', 'full']);
  const rawTerms = qLower.split(/\s+/).filter(w => w.length > 0);
  const significantTerms = rawTerms.filter(w => !STOP_WORDS.has(w) && w.length > 1);
  const terms = significantTerms.length > 0 ? significantTerms : rawTerms;

  return CURATED_YOUTUBE_CATALOG.filter(track => {
    const title = (track.title || '').toLowerCase();
    const artist = (track.artist || '').toLowerCase();
    const moods = (track.moods || []).join(' ').toLowerCase();
    const category = (track.category || '').toLowerCase();
    const combined = `${title} ${artist} ${moods} ${category}`;

    if (title.includes(qLower) || artist.includes(qLower)) return true;
    return terms.every(term => combined.includes(term));
  });
}

/**
 * Filter catalog by category/genre
 */
export function filterOnlineByCategory(category: string): YouTubeTrack[] {
  if (!category || category === 'all') return CURATED_YOUTUBE_CATALOG;
  const catLower = category.toLowerCase();

  return CURATED_YOUTUBE_CATALOG.filter(track => {
    if (track.category && track.category.toLowerCase() === catLower) return true;
    if (track.moods && track.moods.some(m => m.toLowerCase() === catLower)) return true;
    if (catLower === 'trending' && (track.category === 'trending' || track.views?.includes('B') || track.views?.includes('M'))) return true;
    if (catLower === 'pop' && (track.category === 'pop' || track.moods?.includes('party'))) return true;
    if (catLower === 'indian' && (track.category === 'bollywood' || track.category === 'telugu' || track.category === 'hindi')) return true;
    if (catLower === 'chill' && (track.category === 'lofi' || track.moods?.includes('relaxing') || track.moods?.includes('sleep'))) return true;
    if (catLower === 'workout' && (track.moods?.includes('workout') || track.category === 'edm' || track.category === 'rock')) return true;
    if (catLower === 'lyrics' && (track.type === 'lyric' || track.category === 'lyrics' || (track.lyrics && track.lyrics.length > 0))) return true;
    return false;
  });
}

/**
 * Primary Search Function:
 * 1. Checks memory cache
 * 2. Matches curated catalog instantly
 * 3. Fetches live YouTube results asynchronously
 * 4. Merges & deduplicates preserving high relevance
 */
export async function searchYouTubeTracks(
  query: string,
  maxResults: number = 30
): Promise<YouTubeTrack[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return CURATED_YOUTUBE_CATALOG.slice(0, maxResults);
  }

  // 1. Check cache
  const cached = searchCache.get(cleanQuery.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results.slice(0, maxResults);
  }

  // 2. Instant curated matches
  const curatedMatches = searchCuratedCatalog(cleanQuery);

  // 3. Live search from YouTube or Local Server
  let liveResults: YouTubeTrack[] = [];
  try {
    // Try direct YouTube search first
    liveResults = await fetchDirectYouTube(cleanQuery);
  } catch (err1) {
    try {
      // Fallback to local server proxy if on network
      liveResults = await fetchLocalStudioSearch(cleanQuery);
    } catch (_) {
      // Direct live search unavailable; continue with curated
    }
  }

  // 4. Merge results: live results first, followed by curated catalog matches
  const mergedMap = new Map<string, YouTubeTrack>();

  // Add live results first
  for (const track of liveResults) {
    if (track.youtubeId && !mergedMap.has(track.youtubeId)) {
      // Check if curated has rich lyrics or metadata for this same video
      const curatedMatch = CURATED_YOUTUBE_CATALOG.find(c => c.youtubeId === track.youtubeId);
      if (curatedMatch) {
        mergedMap.set(track.youtubeId, {
          ...curatedMatch,
          ...track,
          lyrics: curatedMatch.lyrics,
        });
      } else {
        mergedMap.set(track.youtubeId, track);
      }
    }
    if (mergedMap.size >= maxResults) break;
  }

  // Add curated matches that were not already in live results
  for (const track of curatedMatches) {
    if (track.youtubeId && !mergedMap.has(track.youtubeId)) {
      mergedMap.set(track.youtubeId, track);
    }
    if (mergedMap.size >= maxResults) break;
  }

  const combined = Array.from(mergedMap.values());

  // Store in cache
  if (combined.length > 0) {
    searchCache.set(cleanQuery.toLowerCase(), {
      timestamp: Date.now(),
      results: combined,
    });
  }

  return combined.length > 0 ? combined.slice(0, maxResults) : curatedMatches.slice(0, maxResults);
}

/**
 * Get trending songs
 */
export async function getTrendingMusic(maxResults = 30): Promise<YouTubeTrack[]> {
  try {
    const liveTrending = await searchYouTubeTracks('trending music 2024', maxResults);
    if (liveTrending && liveTrending.length > 0) {
      return liveTrending;
    }
  } catch (_) {}
  return CURATED_YOUTUBE_CATALOG.slice(0, maxResults);
}

/**
 * Check if API key is present
 */
export const isApiKeyConfigured = (): boolean => {
  return YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY' && YOUTUBE_API_KEY.length > 10;
};
