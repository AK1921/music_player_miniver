const moodNames = {
  happy: 'Happy', sad: 'Sad', relaxing: 'Relaxing', workout: 'Workout',
  devotional: 'Devotional', focus: 'Focus', party: 'Party', drive: 'Driving', romantic: 'Romantic'
};

const moodTerms = {
  happy: /\b(happy|upbeat|cheerful)\b/i,
  sad: /\b(sad|heartbreak|melancholy)\b/i,
  relaxing: /\b(relax\w*|chill|sleep|calm|meditat\w*)\b/i,
  workout: /\b(workout|gym|running|energetic)\b/i,
  devotional: /\b(devotional|bhajan|mantra|chalisa)\b/i,
  focus: /\b(focus|study|lo[ -]?fi)\b/i,
  party: /\b(party|dance|edm)\b/i,
  drive: /\b(drive|driving|road trip)\b/i,
  romantic: /\b(romantic|love songs)\b/i
};

function recommendationMood(query) {
  return Object.keys(moodTerms).find(mood => moodTerms[mood].test(query));
}

function isPreferredRecommendation(track) {
  return ['hindi', 'telugu', 'bollywood'].includes(track.category);
}

function rankMusicRecommendations({ query = '', mood, matches = [], insights = {}, preferredOnly = false } = {}) {
  const effectiveMood = recommendationMood(query) || mood;
  const moodMatches = effectiveMood ? new Set(filterCatalogByMood(effectiveMood).map(track => track.id)) : new Set();
  const context = matches.slice(0, 5);
  const artists = new Set(context.map(track => track.artist?.toLowerCase()));
  const categories = new Set(context.map(track => track.category).filter(category => category && category !== 'trending'));
  const topArtists = (insights.topArtists || []).slice(0, 5).map(artist => artist.toLowerCase());
  const topGenres = (insights.topGenres || []).slice(0, 5);
  const terms = query.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(word =>
    word.length > 1 && !/^(a|the|of|for|me|play|find|song|songs|music|video|videos|official)$/.test(word)) || [];
  const candidates = [...REAL_SONGS_CATALOG, ...matches];
  const eligible = preferredOnly ? candidates.filter(isPreferredRecommendation) : candidates;
  const catalog = [...new Map(eligible.map(track => [track.youtubeId, track])).values()];
  const ranked = catalog.map(track => {
    const artist = track.artist.toLowerCase();
    const words = `${track.title} ${artist} ${track.category || ''}`.toLowerCase();
    const score =
      (effectiveMood && track.moods?.includes(effectiveMood) ? 16 : 0) +
      (moodMatches.has(track.id) ? 8 : 0) +
      (artists.has(artist) ? 16 : 0) +
      (categories.has(track.category) ? 6 : 0) +
      terms.filter(term => words.includes(term)).length * 5 +
      (matches.some(match => match.youtubeId === track.youtubeId) ? 3 : 0) +
      (topArtists.includes(artist) ? 4 : 0) +
      (topGenres.includes(track.category) ? 2 : 0) +
      (['hindi', 'telugu'].includes(track.category) ? 1 : 0);
    return { track, score };
  }).sort((a, b) => b.score - a.score).map(item => item.track);
  if (preferredOnly && !effectiveMood && !context.some(isPreferredRecommendation) && !topArtists.length && !topGenres.length) {
    const hindi = ranked.filter(track => track.category !== 'telugu').slice(0, 4);
    const telugu = ranked.filter(track => track.category === 'telugu').slice(0, 4);
    return hindi.flatMap((track, i) => [track, telugu[i]]).filter(Boolean);
  }
  return ranked.slice(0, 8);
}

let recommendationRender = 0;

async function renderRecommendedSection() {
  const container = document.getElementById('recommended-songs-container');
  if (!container) return;
  const render = ++recommendationRender;
  const insights = await getListeningInsights();
  if (render !== recommendationRender) return;
  const { lastSearchQuery: query, recommendationMood: mood, searchMatches: matches } = STATE;
  const tracks = rankMusicRecommendations({ query, mood, matches, insights, preferredOnly: true });
  const label = document.getElementById('recommendation-context');
  const inferredMood = recommendationMood(query || '') || mood;
  label.textContent = query && matches?.some(isPreferredRecommendation) ? `Related to “${query}”` :
    inferredMood ? moodNames[inferredMood] : 'Hindi & Telugu';
  container.replaceChildren(...tracks.map(track => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rec-card';
    button.onclick = () => PLAYBACK_CONTROLLER.playAudio(track, tracks);
    button.innerHTML = `<img src="${escapeHtml(track.artwork)}" class="rec-card-thumb" alt="" loading="lazy">
      <div class="rec-card-body">
        <div class="rec-card-title">${escapeHtml(track.title)}</div>
        <div class="rec-card-artist">${escapeHtml(track.artist)}</div>
      </div>`;
    return button;
  }));
}
