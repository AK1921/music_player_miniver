// ==============================================================================
// AK YOUTUBE MUSIC & VIDEO SERVICE
// Live YouTube Scraper + Free YouTube API + Multi-Source Fallback + Curated Catalog
// Designed for high-resilience playback & search in mobile Android app
// ==============================================================================

import curatedCatalogData from './curatedCatalog.json';
import { Track } from '../types';

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://musicplayerminiver.vercel.app';

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
  resultLabel?: string;
}

// 45+ Verified playable curated tracks loaded directly from catalog
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
  resultLabel: t.resultLabel || (t.type === 'lyric' ? 'Lyrics' : 'Video'),
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

function parseVideoRenderer(renderer: any, contentKind?: string): YouTubeTrack | null {
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
  const isLive = durationOverlay?.style === 'LIVE';

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
    resultLabel: isLive ? 'Live' : contentKind || (isLyric ? 'Lyrics' : 'Video'),
  };
}

function parseYouTubeResultsHtml(html: string): YouTubeTrack[] {
  const data = extractYtInitialData(html);
  const searchContents =
    data.contents?.twoColumnSearchResultsRenderer?.primaryContents ||
    data.contents?.singleColumnSearchResultsRenderer ||
    data.contents;

  if (!searchContents) return [];

  const rendererKinds: Record<string, string> = {
    videoRenderer: '',
    compactVideoRenderer: '',
    videoWithContextRenderer: '',
    movieRenderer: 'Film',
    reelItemRenderer: 'Short',
    shortsLockupViewModel: 'Short',
  };

  const results = new Map<string, YouTubeTrack>();

  function visit(node: any) {
    if (!node || typeof node !== 'object' || results.size >= 40) return;
    for (const [key, value] of Object.entries(node)) {
      if (Object.hasOwn(rendererKinds, key)) {
        const video = parseVideoRenderer(value, rendererKinds[key]);
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
 * Fetch live YouTube search directly using Desktop user agent for parsing stability
 */
async function fetchDirectYouTube(query: string): Promise<YouTubeTrack[]> {
  const params = new URLSearchParams({ search_query: query });
  let lastError: any;

  for (const host of ['www.youtube.com', 'm.youtube.com']) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`https://${host}/results?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`YouTube responded with HTTP ${response.status}`);
      const html = await response.text();
      const tracks = parseYouTubeResultsHtml(html);
      if (tracks.length > 0) {
        return tracks;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No tracks parsed from YouTube');
}

/**
 * Fetch from Cloud Studio production server or custom endpoint.
 */
async function fetchStudioCloudSearch(query: string): Promise<YouTubeTrack[]> {
  const ep = `${API_URL.replace(/\/$/, '')}/api/youtube-search?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(ep, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
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
          moods: t.moods || ['all'],
          resultLabel: t.resultLabel,
        }));
      }
    }
    throw new Error(`API returned HTTP ${res.status}`);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Filter curated catalog by search terms
 */
export function searchCuratedCatalog(query: string): YouTubeTrack[] {
  if (!query || !query.trim()) return CURATED_YOUTUBE_CATALOG;
  const qLower = query.toLowerCase().trim();
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'by',
    'song', 'songs', 'video', 'videos', 'music', 'official', 'full',
  ]);
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
 * Mood dictionary matching Web App recommendation engine
 */
export const MOOD_TERMS: Record<string, RegExp> = {
  happy: /\b(happy|upbeat|cheerful)\b/i,
  sad: /\b(sad|heartbreak|melancholy)\b/i,
  relaxing: /\b(relax\w*|chill|sleep|calm|meditat\w*)\b/i,
  workout: /\b(workout|gym|running|energetic)\b/i,
  devotional: /\b(devotional|bhajan|mantra|chalisa)\b/i,
  focus: /\b(focus|study|lo[ -]?fi)\b/i,
  party: /\b(party|dance|edm)\b/i,
  drive: /\b(drive|driving|road trip)\b/i,
  romantic: /\b(romantic|love songs)\b/i,
};

export function recommendationMood(query: string): string | undefined {
  return Object.keys(MOOD_TERMS).find(mood => MOOD_TERMS[mood].test(query));
}

function isPreferredRecommendation(track: YouTubeTrack): boolean {
  const cat = (track.category || '').toLowerCase();
  return ['hindi', 'telugu', 'bollywood'].includes(cat);
}

/**
 * Rank recommendations reusing the Web application's discovery algorithm
 */
export function rankMusicRecommendations({
  query = '',
  mood,
  matches = [],
  recentlyPlayed = [],
  preferredOnly = false,
}: {
  query?: string;
  mood?: string;
  matches?: YouTubeTrack[];
  recentlyPlayed?: Track[];
  preferredOnly?: boolean;
} = {}): YouTubeTrack[] {
  const effectiveMood = recommendationMood(query) || mood;
  const moodCandidates = effectiveMood
    ? CURATED_YOUTUBE_CATALOG.filter(t => t.moods && t.moods.includes(effectiveMood))
    : [];
  const moodMatches = new Set(moodCandidates.map(t => t.id));

  const context = matches.slice(0, 5);
  const artists = new Set(context.map(t => t.artist?.toLowerCase()).filter(Boolean));
  const categories = new Set(
    context.map(t => t.category).filter(c => c && c !== 'trending')
  );

  const recentArtists = new Set(
    (recentlyPlayed || []).slice(0, 5).map(t => t.artist?.toLowerCase()).filter(Boolean)
  );

  const terms =
    query
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter(
        word =>
          word.length > 1 &&
          !/^(a|the|of|for|me|play|find|song|songs|music|video|videos|official)$/.test(word)
      ) || [];

  const candidates = [...CURATED_YOUTUBE_CATALOG, ...matches];
  const eligible = preferredOnly ? candidates.filter(isPreferredRecommendation) : candidates;
  const catalog = Array.from(new Map(eligible.map(track => [track.youtubeId, track])).values());

  const ranked = catalog
    .map(track => {
      const artist = (track.artist || '').toLowerCase();
      const words = `${track.title} ${artist} ${track.category || ''}`.toLowerCase();
      const score =
        (effectiveMood && track.moods?.includes(effectiveMood) ? 16 : 0) +
        (moodMatches.has(track.id) ? 8 : 0) +
        (artists.has(artist) ? 16 : 0) +
        (categories.has(track.category) ? 6 : 0) +
        terms.filter(term => words.includes(term)).length * 5 +
        (matches.some(match => match.youtubeId === track.youtubeId) ? 3 : 0) +
        (recentArtists.has(artist) ? 6 : 0) +
        (['hindi', 'telugu', 'bollywood'].includes((track.category || '').toLowerCase()) ? 2 : 0);
      return { track, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.track);

  if (preferredOnly && !effectiveMood && !context.some(isPreferredRecommendation) && recentArtists.size === 0) {
    const hindi = ranked.filter(t => t.category !== 'telugu').slice(0, 6);
    const telugu = ranked.filter(t => t.category === 'telugu').slice(0, 6);
    return hindi.flatMap((track, i) => [track, telugu[i]]).filter(Boolean) as YouTubeTrack[];
  }

  return ranked.slice(0, 24);
}

/**
 * Filter catalog by category/genre
 */
export function filterOnlineByCategory(category: string): YouTubeTrack[] {
  if (!category || category === 'all') return CURATED_YOUTUBE_CATALOG;
  const catLower = category.toLowerCase();

  return CURATED_YOUTUBE_CATALOG.filter(track => {
    const cat = (track.category || '').toLowerCase();
    const moods = (track.moods || []).map(m => m.toLowerCase());

    if (cat === catLower || moods.includes(catLower)) return true;
    if (catLower === 'trending' && (cat === 'trending' || track.views?.includes('B') || track.views?.includes('M'))) return true;
    if (catLower === 'pop' && (cat === 'pop' || moods.includes('party'))) return true;
    if (catLower === 'indian' && (cat === 'bollywood' || cat === 'telugu' || cat === 'hindi')) return true;
    if (catLower === 'chill' && (cat === 'lofi' || moods.includes('relaxing') || moods.includes('sleep'))) return true;
    if (catLower === 'workout' && (moods.includes('workout') || cat === 'edm' || cat === 'rock')) return true;
    if (catLower === 'rock' && (cat === 'rock' || moods.includes('rock'))) return true;
    if (catLower === 'party' && (moods.includes('party') || cat === 'edm')) return true;
    if (catLower === 'lyrics' && (track.type === 'lyric' || cat === 'lyrics' || (track.lyrics && track.lyrics.length > 0))) return true;
    return false;
  });
}

/**
 * Get category tracks with optional live query enhancement
 */
export async function getOnlineCategoryTracks(category: string): Promise<YouTubeTrack[]> {
  const curated = filterOnlineByCategory(category);

  // If specific category requested, try fetching live complement if network available
  if (category && category !== 'all') {
    const categoryQueryMap: Record<string, string> = {
      trending: 'trending music hits 2024',
      pop: 'top pop songs',
      rock: 'best rock metal songs',
      chill: 'lofi chill beats to relax',
      indian: 'latest bollywood songs',
      workout: 'high energy workout motivation music',
      party: 'dance party hits',
      lyrics: 'popular lyric songs',
    };

    const query = categoryQueryMap[category.toLowerCase()];
    if (query) {
      try {
        const live = await searchYouTubeTracks(query, 16);
        if (live && live.length > 0) {
          const map = new Map<string, YouTubeTrack>();
          for (const t of curated) map.set(t.youtubeId, t);
          for (const t of live) {
            if (!map.has(t.youtubeId)) map.set(t.youtubeId, t);
          }
          return Array.from(map.values());
        }
      } catch (_) {}
    }
  }

  return curated;
}

/**
 * Primary Search Function:
 * 1. Checks memory cache
 * 2. Matches curated catalog instantly
 * 3. Fetches live results via Cloud Production Server (with direct scraper fallback)
 * 4. Merges & deduplicates preserving high relevance
 */
export async function searchYouTubeTracks(
  query: string,
  maxResults: number = 30
): Promise<YouTubeTrack[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return rankMusicRecommendations();
  }

  // 1. Check cache
  const cacheKey = cleanQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results.slice(0, maxResults);
  }

  // 2. Instant curated matches
  const curatedMatches = searchCuratedCatalog(cleanQuery);

  // 3. Live search: Query Cloud Studio Search first
  let liveResults: YouTubeTrack[] = [];
  try {
    liveResults = await fetchStudioCloudSearch(cleanQuery);
  } catch (errCloud) {
    try {
      // Fallback to direct desktop YouTube scraping if cloud endpoint is unreachable
      liveResults = await fetchDirectYouTube(cleanQuery);
    } catch (_) {
      // Live search unavailable; continue with curated matches
    }
  }

  // 4. Merge results: live results first, followed by curated catalog matches
  const mergedMap = new Map<string, YouTubeTrack>();

  // Add live results first
  for (const track of liveResults) {
    if (track.youtubeId && !mergedMap.has(track.youtubeId)) {
      const curatedMatch = CURATED_YOUTUBE_CATALOG.find(c => c.youtubeId === track.youtubeId);
      if (curatedMatch) {
        mergedMap.set(track.youtubeId, {
          ...curatedMatch,
          ...track,
          lyrics: curatedMatch.lyrics || track.lyrics,
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
    searchCache.set(cacheKey, {
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
  return filterOnlineByCategory('trending').slice(0, maxResults);
}

/**
 * Convert YouTubeTrack to common Track format used by PlayerStore
 */
export function youtubeTrackToAppTrack(yt: YouTubeTrack): Track {
  return {
    id: yt.id || `yt_${yt.youtubeId}`,
    url: yt.url || `https://www.youtube.com/watch?v=${yt.youtubeId}`,
    title: yt.title,
    artist: yt.artist || 'YouTube Music',
    album: yt.category ? `YouTube · ${yt.category}` : 'YouTube Online',
    artwork: yt.artwork || `https://i.ytimg.com/vi/${yt.youtubeId}/hqdefault.jpg`,
    duration: yt.duration || 210,
    youtubeId: yt.youtubeId,
    isOnline: true,
  };
}
