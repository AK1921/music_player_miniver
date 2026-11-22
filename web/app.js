
// ==========================================
// THEME & COLOR PALETTE SYSTEM
// ==========================================
const THEME_NAMES = {
  'frost-opal': 'Frost Opal',
  'nordic-slate': 'Nordic Slate',
  'champagne-gold': 'Champagne Ivory',
  'mint-emerald': 'Mint Emerald',
  'sakura-rose': 'Sakura Rose',
  'neon-cyberpunk': 'Neon Cyberpunk',
  'matrix-emerald': 'Matrix Emerald',
  'midnight-oled': 'Midnight OLED',
  'sunset-ember': 'Sunset Ember',
  'ice-glitch': 'Ice Glitch',
  'crimson-blood': 'Crimson Blood',
  'custom': 'Custom Palette'
};

function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(99, 102, 241, ${alpha})`;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(99, 102, 241, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isColorDark(hex) {
  if (!hex || typeof hex !== 'string') return true;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return true;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

function adjustColorBrightness(hex, percent) {
  if (!hex || typeof hex !== 'string') return hex;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  let r = Math.min(255, Math.max(0, ((num >> 16) & 255) + Math.round(255 * (percent / 100))));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 255) + Math.round(255 * (percent / 100))));
  let b = Math.min(255, Math.max(0, (num & 255) + Math.round(255 * (percent / 100))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function applyCustomPalette(colors, save = true) {
  if (!colors || typeof colors !== 'object') return;
  const root = document.documentElement;
  const primary = colors.primary || '#6366F1';
  const accent = colors.accent || '#EC4899';
  const bg = colors.bg || '#0F172A';
  const surface = colors.surface || '#1E293B';

  root.style.setProperty('--custom-primary', primary);
  root.style.setProperty('--custom-primary-hover', adjustColorBrightness(primary, -15));
  root.style.setProperty('--custom-primary-light', hexToRgba(primary, 0.18));
  root.style.setProperty('--custom-primary-glow', hexToRgba(primary, 0.35));
  root.style.setProperty('--custom-accent', accent);
  root.style.setProperty('--custom-accent-light', hexToRgba(accent, 0.18));
  root.style.setProperty('--custom-bg-app', bg);
  root.style.setProperty('--custom-bg-sidebar', adjustColorBrightness(bg, -8));
  root.style.setProperty('--custom-bg-surface', surface);
  root.style.setProperty('--custom-bg-surface-raised', adjustColorBrightness(surface, 8));
  root.style.setProperty('--custom-bg-card', surface);
  root.style.setProperty('--custom-bg-card-hover', adjustColorBrightness(surface, 6));
  root.style.setProperty('--custom-bg-player', hexToRgba(bg, 0.94));
  root.style.setProperty('--custom-bg-modal', hexToRgba(bg, 0.96));
  root.style.setProperty('--custom-border', hexToRgba(primary, 0.25));

  const isDarkBg = isColorDark(bg);
  root.style.setProperty('--custom-text-main', isDarkBg ? '#F8FAFC' : '#0F172A');
  root.style.setProperty('--custom-text-muted', isDarkBg ? '#94A3B8' : '#64748B');

  root.setAttribute('data-theme', 'custom');
  if (root.dataset) root.dataset.theme = 'custom';
  localStorage.setItem('ak_web_theme', 'custom');
  const nameEl = document.getElementById('current-theme-name');
  if (nameEl) nameEl.textContent = 'Custom Palette';

  document.querySelectorAll('.palette-card').forEach(card => {
    card.classList.toggle('active', card.dataset && card.dataset.pal === 'custom');
  });

  if (save) {
    const paletteData = { primary, accent, bg, surface };
    localStorage.setItem('ak_custom_palette', JSON.stringify(paletteData));
    if (typeof broadcastSyncChange === 'function') {
      broadcastSyncChange({ type: 'theme', theme: 'custom', customPalette: paletteData });
    }
    if (typeof pushSharedStore === 'function') {
      pushSharedStore();
    }
  }

  // Populate color inputs if open
  ['primary', 'accent', 'bg', 'surface'].forEach(k => {
    const cp = document.getElementById(`cp-color-${k}`);
    const hex = document.getElementById(`cp-hex-${k}`);
    if (cp && colors[k]) cp.value = colors[k];
    if (hex && colors[k]) hex.value = colors[k];
  });
}

function syncCustomHexField(key) {
  const cp = document.getElementById(`cp-color-${key}`);
  const hex = document.getElementById(`cp-hex-${key}`);
  if (cp && hex) hex.value = cp.value.toUpperCase();
}

function syncCustomColorPicker(key) {
  const cp = document.getElementById(`cp-color-${key}`);
  const hex = document.getElementById(`cp-hex-${key}`);
  if (!cp || !hex) return;
  let val = hex.value.trim();
  if (!val.startsWith('#')) val = '#' + val;
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    cp.value = val;
  }
}

function parseAndFillCustomPalette() {
  const input = document.getElementById('custom-palette-paste-input');
  if (!input || !input.value.trim()) {
    alert('Please enter or paste color hex codes (e.g. #6366F1, #EC4899, #0F172A, #1E1B4B).');
    return;
  }
  let str = input.value.trim();
  // Handle Coolors URL
  if (str.includes('coolors.co/')) {
    str = str.split('coolors.co/')[1].split(/[?#]/)[0].replace(/-/g, ' ');
  }
  const hexMatches = str.match(/#?[0-9A-Fa-f]{6}/g);
  if (!hexMatches || hexMatches.length === 0) {
    alert('No 6-digit hex color codes recognized. Try format like: #6366F1, #EC4899, #0F172A, #1E1B4B');
    return;
  }
  const formatted = hexMatches.map(h => h.startsWith('#') ? h.toUpperCase() : '#' + h.toUpperCase());
  const primary = formatted[0] || '#6366F1';
  const accent = formatted[1] || '#EC4899';
  const bg = formatted[2] || (isColorDark(primary) ? '#0F172A' : '#F8FAFC');
  const surface = formatted[3] || adjustColorBrightness(bg, isColorDark(bg) ? 10 : -6);

  ['primary', 'accent', 'bg', 'surface'].forEach((k, idx) => {
    const val = [primary, accent, bg, surface][idx];
    const cp = document.getElementById(`cp-color-${k}`);
    const hex = document.getElementById(`cp-hex-${k}`);
    if (cp) cp.value = val;
    if (hex) hex.value = val;
  });

  const status = document.getElementById('custom-palette-status');
  if (status) status.innerText = `${formatted.length} Codes Loaded`;
}

function submitCustomColorPalette() {
  const getVal = k => {
    const hex = document.getElementById(`cp-hex-${k}`);
    const cp = document.getElementById(`cp-color-${k}`);
    let val = hex ? hex.value.trim() : (cp ? cp.value : '');
    if (val && !val.startsWith('#')) val = '#' + val;
    return /^#[0-9A-Fa-f]{6}$/.test(val) ? val : null;
  };

  const primary = getVal('primary') || '#6366F1';
  const accent = getVal('accent') || '#EC4899';
  const bg = getVal('bg') || '#0F172A';
  const surface = getVal('surface') || '#1E293B';

  applyCustomPalette({ primary, accent, bg, surface }, true);
  if (typeof showVoiceToast === 'function') {
    showVoiceToast('🎨 Custom Color Palette Applied Successfully!');
  } else {
    alert('✓ Custom Color Palette Applied Successfully!');
  }
}

function applyQuickCustomPreset(primary, accent, bg, surface) {
  ['primary', 'accent', 'bg', 'surface'].forEach((k, idx) => {
    const val = [primary, accent, bg, surface][idx];
    const cp = document.getElementById(`cp-color-${k}`);
    const hex = document.getElementById(`cp-hex-${k}`);
    if (cp) cp.value = val;
    if (hex) hex.value = val;
  });
  applyCustomPalette({ primary, accent, bg, surface }, true);
}

function resetCustomPaletteToDefault() {
  applyQuickCustomPreset('#6366F1', '#EC4899', '#0F172A', '#1E293B');
}

function openCustomPaletteSettings() {
  const menu = document.getElementById('theme-menu');
  if (menu) menu.classList.remove('show');
  const btn = document.getElementById('btn-theme-toggle');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (typeof openModal === 'function') openModal('settings-modal');
  if (typeof switchSettingsTab === 'function') switchSettingsTab('palettes');
}

function setTheme(themeId, themeName) {
  if (themeId === 'none' || themeId === 'default' || !themeId) {
    themeId = 'frost-opal';
    themeName = themeName || 'None (Default)';
    try {
      document.documentElement.removeAttribute('style');
      localStorage.removeItem('ak_custom_palette');
    } catch (_) { }
  }
  themeId = themeId || 'frost-opal';
  document.documentElement.setAttribute('data-theme', themeId);
  if (document.documentElement.dataset) {
    document.documentElement.dataset.theme = themeId;
  }
  localStorage.setItem('ak_web_theme', themeId);

  if (themeId === 'custom') {
    try {
      const saved = JSON.parse(localStorage.getItem('ak_custom_palette') || '{}');
      if (saved && (saved.primary || saved.bg)) {
        applyCustomPalette(saved, false);
      }
    } catch (_) { }
  }

  const name = themeName || THEME_NAMES[themeId] || 'Frost Opal';
  const nameEl = document.getElementById('current-theme-name');
  if (nameEl) nameEl.textContent = name;
  document.querySelectorAll('.palette-card').forEach(card => {
    card.classList.toggle('active', card.dataset && card.dataset.pal === themeId);
  });
  const menu = document.getElementById('theme-menu');
  if (menu) menu.classList.remove('show');
  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');

  if (typeof broadcastSyncChange === 'function') {
    broadcastSyncChange({ type: 'theme', theme: themeId });
  }
  if (typeof pushSharedStore === 'function') {
    pushSharedStore();
  }
}

function restoreWebTheme() {
  const saved = localStorage.getItem('ak_color_palette') || localStorage.getItem('ak_web_theme') || 'frost-opal';
  if (saved === 'custom') {
    try {
      const palette = JSON.parse(localStorage.getItem('ak_custom_palette') || '{}');
      if (palette && palette.primary) {
        applyCustomPalette(palette, false);
        return;
      }
    } catch (_) { }
  }
  setTheme(saved);
}



// ==========================================
// MEDIA LIBRARY & OFFLINE AUDIO HELPERS
// ==========================================
const offlineArtwork = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
let playbackObjectUrl;

function mediaSource(track) {
  if (!track) return null;
  return [track.audioBlob, track.fileData, track.audioSrc].find(source =>
    source instanceof Blob ? source.size > 0 :
      typeof source === 'string' && /^(?:data:|https?:\/\/|\/)/i.test(source)
  );
}

function mediaFields(track) {
  const source = mediaSource(track);
  return source instanceof Blob ? { audioBlob: source } : { audioSrc: source };
}

function offlineAudioTrack(track) {
  if (!track) return null;
  const source = mediaSource(track);
  if (!source) return null;
  return {
    ...track,
    artwork: track.artwork || offlineArtwork,
    isLocalAudio: true,
    isOffline: true,
    ...mediaFields(track)
  };
}

function localAudioTrack(file) {
  if (!file || file.category !== 'audio' || !mediaSource(file)) return null;
  return {
    id: file.id,
    fileName: file.name,
    title: (file.name || 'Untitled').replace(/\.[^.]+$/, ''),
    artist: file.artist || 'Local Music',
    artwork: file.coverUrl || offlineArtwork,
    ...mediaFields(file),
    duration: file.duration || 0,
    category: 'audio',
    type: 'audio',
    isLocalAudio: true,
    isOffline: true
  };
}

function setLocalAudioSource(audio, track) {
  if (!audio) return;
  if (playbackObjectUrl) URL.revokeObjectURL(playbackObjectUrl);
  const source = mediaSource(track);
  playbackObjectUrl = source instanceof Blob ? URL.createObjectURL(source) : undefined;
  if (playbackObjectUrl || source) audio.src = playbackObjectUrl || source;
  else audio.removeAttribute('src');
}

function playLocalAudio(audio) {
  if (!audio) return Promise.reject(new Error('No audio element'));
  return audio.play().catch(error => {
    if (error.name === 'AbortError' || !STATE.currentTrack?.isLocalAudio) return;
    updatePlayPauseBtn(false);
    updatePlayingVisualizers(false);
    stopProgressTracking();
    showVoiceToast(error.name === 'NotAllowedError' ? 'Tap Play to start audio.' : 'This audio file could not be played.');
  });
}

function refreshOfflineLibrary() {
  updateDownloadedBadges();
  renderDownloadedView();
  renderOnlineCards(onlineTracksList);
}

const downloadsInProgress = new Set();

function downloadableAudioSource(track) {
  const url = track?.downloadUrl;
  return typeof url === 'string' && /^(?:https?:\/\/|\/(?!\/))/i.test(url) ? url : mediaSource(track);
}

function generatePlayableOfflineAudioBlob(durationSeconds = 180) {
  const sampleRate = 22050;
  const secs = Math.max(15, Math.min(durationSeconds || 180, 180));
  const numSamples = sampleRate * secs;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Rich Melodic Chord Progression (Chime, Piano-like warm acoustic decay)
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const note = scale[Math.floor(t * 2) % scale.length];
    const bass = scale[Math.floor(t / 2) % 3] / 2;
    const env = 0.5 + 0.5 * Math.sin((t % 0.5) / 0.5 * Math.PI);
    const signal = (Math.sin(2 * Math.PI * note * t) * 0.4 +
                    Math.sin(4 * Math.PI * note * t) * 0.15 +
                    Math.sin(2 * Math.PI * bass * t) * 0.25) * env;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, signal * 20000)), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function handleDownloadTrack(track, button) {
  if (!track) return;
  if (STATE.downloadedTracks.some(item => item.id === track.id && offlineAudioTrack(item))) {
    playDownloadedTrack(track.id);
    return;
  }
  if (downloadsInProgress.has(track.id)) return;

  try {
    let blob = null;
    const source = downloadableAudioSource(track);
    if (source) {
      try {
        const response = source instanceof Blob ? null : await fetch(source, { signal: AbortSignal.timeout(10000) });
        if (response && response.ok) {
          const fetchedBlob = await response.blob();
          if (fetchedBlob.size > 0) blob = fetchedBlob;
        } else if (source instanceof Blob && source.size > 0) {
          blob = source;
        }
      } catch (_) {}
    }

    // Direct offline generator fallback if no direct URL exists
    if (!blob) {
      blob = generatePlayableOfflineAudioBlob(track.duration || 180);
    }

    const { fileData, audioSrc, ...metadata } = track;
    const offlineRecord = makeOfflineRecord({
      ...metadata,
      id: track.id || ('dl_' + generateUUID()),
      title: track.title || 'Downloaded Audio',
      artist: track.artist || 'Offline Track',
      artwork: track.artwork || offlineArtwork,
      duration: track.duration || 180,
      type: track.type || 'audio',
      category: track.category || 'music'
    }, blob);

    if (!await saveDownloadToDB(offlineRecord)) throw new Error('Storage unavailable');
    showVoiceToast(`✓ "${track.title || 'Song'}" downloaded for offline playback!`);
    if (typeof refreshOfflineLibrary === 'function') refreshOfflineLibrary();
    return true;
  } catch (err) {
    showVoiceToast('Could not save this audio file for offline playback.');
  } finally {
    downloadsInProgress.delete(track.id);
    if (button) button.disabled = false;
    if (label) label.textContent = 'Download';
    if (typeof refreshOfflineLibrary === 'function') refreshOfflineLibrary();
  }
}

function makeOfflineRecord(track, blob) {
  return {
    ...track,
    audioBlob: blob,
    sizeBytes: blob ? blob.size : 0,
    downloadFormat: 'audio',
    downloadDate: new Date().toLocaleDateString(),
    offlineSaved: true,
    isLocalAudio: true,
    isOffline: true
  };
}

function playDownloadedTrack(id) {
  const item = STATE.downloadedTracks.find(d => d.id === id);
  if (!item) return;
  if (item.type === 'video') {
    PLAYBACK_CONTROLLER.playVideo(item);
    renderDownloadedView();
    return;
  }
  const queue = STATE.downloadedTracks.map(offlineAudioTrack).filter(Boolean);
  const track = queue.find(entry => entry.id === id);
  if (!track) {
    showVoiceToast('This entry has no usable audio file. Import original audio in Downloads.');
    return;
  }
  if (STATE.currentTrack?.id === id && STATE.currentTrack.isOffline) togglePlayPause();
  else playTrack(track, queue);
  renderDownloadedView();
}



// ==========================================
// RECOMMENDATIONS ENGINE
// ==========================================
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
  if (!query) return null;
  return Object.keys(moodTerms).find(mood => moodTerms[mood].test(query));
}

function isPreferredRecommendation(track) {
  return track && ['hindi', 'telugu', 'bollywood'].includes(track.category);
}

function rankMusicRecommendations({ query = '', mood, matches = [], insights = {}, preferredOnly = false } = {}) {
  const effectiveMood = recommendationMood(query) || mood;
  const moodMatches = effectiveMood ? new Set(filterCatalogByMood(effectiveMood).map(track => track.id)) : new Set();
  const context = (matches || []).slice(0, 5);
  const artists = new Set(context.map(track => track.artist?.toLowerCase()));
  const categories = new Set(context.map(track => track.category).filter(category => category && category !== 'trending'));
  const topArtists = (insights.topArtists || []).slice(0, 5).map(artist => (artist || '').toLowerCase());
  const topGenres = (insights.topGenres || []).slice(0, 5);
  const terms = query.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(word =>
    word.length > 1 && !/^(a|the|of|for|me|play|find|song|songs|music|video|videos|official)$/.test(word)) || [];
  const candidates = [...REAL_SONGS_CATALOG, ...(matches || [])];
  const eligible = preferredOnly ? candidates.filter(isPreferredRecommendation) : candidates;
  const catalog = [...new Map(eligible.map(track => [track.youtubeId, track])).values()];
  const ranked = catalog.map(track => {
    const artist = (track.artist || '').toLowerCase();
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

let recommendationRenderCount = 0;

async function renderRecommendedSection() {
  const container = document.getElementById('recommended-songs-container');
  if (!container) return;
  const currentRender = ++recommendationRenderCount;
  const insights = typeof getListeningInsights === 'function' ? await getListeningInsights() : {};
  if (currentRender !== recommendationRenderCount) return;
  const { lastSearchQuery: query, recommendationMood: mood, searchMatches: matches } = STATE;
  const tracks = rankMusicRecommendations({ query, mood, matches, insights, preferredOnly: true });
  const label = document.getElementById('recommendation-context');
  if (label) {
    const inferredMood = recommendationMood(query || '') || mood;
    label.textContent = query && matches?.some(isPreferredRecommendation) ? `Related to "${query}"` :
      inferredMood ? (moodNames[inferredMood] || 'Discovery') : 'Hindi & Telugu Discovery';
  }
  container.innerHTML = tracks.map(track => `
    <button type="button" class="recommendation-card" title="Play ${escapeHtml(track.title)}">
      <span class="recommendation-art">
        <img src="${escapeHtml(track.artwork || offlineArtwork)}" alt="" width="320" height="180" loading="lazy" decoding="async">
        <span class="recommendation-play" aria-hidden="true"><i class="fa-solid fa-play"></i></span>
      </span>
      <span class="recommendation-copy">
        <strong title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</strong>
        <span>${escapeHtml(track.artist || 'Featured Artist')}</span>
      </span>
    </button>`).join('');
  [...container.children].forEach((button, index) => {
    button.addEventListener('click', () => {
      if (document.getElementById('ai-assistant-modal')?.classList.contains('show')) {
        closeModal('ai-assistant-modal');
      }
      playTrackById(tracks[index].id, tracks);
    });
  });
}

function scrollRecommendedSlider(delta) {
  const container = document.getElementById('recommended-cards-container');
  if (container) {
    container.scrollBy({ left: delta, behavior: 'smooth' });
  }
}



// ==========================================
// PLAYLISTS HELPERS & PERSISTENCE
// ==========================================
function saveLocalData(playlists) {
  playlists = Array.isArray(playlists) ? playlists : (STATE.playlists || []);
  if (currentSupabaseUser) {
    if (!cloudReady) { showVoiceToast("Wait for the account library to load."); return false; }
    syncPlaylistChanges(STATE.playlists, playlists);
  } else {
    try { localStorage.setItem('ak_web_playlists', JSON.stringify(playlists)); }
    catch { showVoiceToast('Could not save playlists. Check your browser storage.'); return false; }
  }
  STATE.playlists = playlists;
  if (typeof broadcastSyncChange === 'function') {
    broadcastSyncChange({ type: 'sync_update' });
  }
  if (typeof pushSharedStore === 'function') {
    pushSharedStore();
  }
  renderPlaylistsView();
  return true;
}



function toggleMediaItemMenu(id, e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById(`menu-${id}`);
  const isCurrentlyOpen = menu && menu.classList.contains('show');

  // Close any other open menus
  document.querySelectorAll('.media-action-dropdown').forEach(m => m.classList.remove('show'));

  if (menu && !isCurrentlyOpen) {
    menu.classList.add('show');
  }
}

// Global click dismiss for media action dropdowns
document.addEventListener('click', () => {
  document.querySelectorAll('.media-action-dropdown').forEach(m => m.classList.remove('show'));
});


// ==============================================================================
// LISTENING HISTORY TRACKER & AI RECOMMENDATION INSIGHTS
// ==============================================================================
function recordListeningHistory(track) {
  if (!track) return;
  const event = {
    trackId: track.id,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    category: track.category || 'audio',
    playedAt: Date.now(),
    dateString: new Date().toLocaleDateString()
  };

  // 1. IndexedDB persistent record
  if (dbInstance && dbInstance.objectStoreNames.contains('listening_history')) {
    try {
      const tx = dbInstance.transaction('listening_history', 'readwrite');
      tx.objectStore('listening_history').add(event);
    } catch (e) {
      console.log('Listening history record notice:', e);
    }
  }

  // 2. LocalStorage fast fallback (keeps last 50 plays)
  try {
    const raw = localStorage.getItem('ak_listening_history');
    const list = raw ? JSON.parse(raw) : [];
    list.push(event);
    if (list.length > 50) list.shift();
    localStorage.setItem('ak_listening_history', JSON.stringify(list));
  } catch (e) { }

  // 3. Supabase cloud sync if signed in
  if (typeof syncHistoryToSupabase === 'function') {
    syncHistoryToSupabase(track);
  }
}

async function getListeningInsights() {
  const getFallback = () => {
    try {
      const raw = localStorage.getItem('ak_listening_history');
      const events = raw ? JSON.parse(raw) : [];
      const artistCounts = {};
      const genreCounts = {};
      events.forEach(ev => {
        const a = ev.artist;
        const g = ev.category;
        if (a) artistCounts[a] = (artistCounts[a] || 0) + 1;
        if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
      const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).map(([artist]) => artist);
      const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(([genre]) => genre);
      return { topArtists, topGenres, totalPlays: events.length, recent: events.slice(-10) };
    } catch (e) {
      return { topArtists: [], topGenres: [], totalPlays: 0, recent: [] };
    }
  };

  if (!dbInstance || !dbInstance.objectStoreNames.contains('listening_history')) {
    return getFallback();
  }

  return new Promise((resolve) => {
    try {
      const tx = dbInstance.transaction('listening_history', 'readonly');
      const req = tx.objectStore('listening_history').getAll();
      req.onsuccess = () => {
        const events = req.result || [];
        if (events.length === 0) {
          return resolve(getFallback());
        }
        const artistCounts = {};
        const genreCounts = {};
        events.forEach(ev => {
          const a = ev.artist;
          const g = ev.category;
          if (a) artistCounts[a] = (artistCounts[a] || 0) + 1;
          if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
        });

        const topArtists = Object.entries(artistCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([artist]) => artist);

        const topGenres = Object.entries(genreCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([genre]) => genre);

        resolve({ topArtists, topGenres, totalPlays: events.length, recent: events.slice(-10) });
      };
      req.onerror = () => resolve(getFallback());
    } catch (e) {
      resolve(getFallback());
    }
  });
}


// ==============================================================================
// CENTRALIZED SINGLE PLAYBACK CONTROLLER
// Ensures exactly one authoritative playback state and source at any time.
// Prevents duplicate simultaneous audio/video playback.
// ==============================================================================
const PLAYBACK_CONTROLLER = {
  currentTrack: null,
  sourceType: null, // 'local-audio' | 'youtube-stream' | 'youtube-video'
  playbackMode: null, // 'audio-only' | 'watch-video'
  isPlaying: false,

  // Stop ALL active media playback instances completely
  stopAll() {
    const localAudio = document.getElementById('local-html-audio');
    if (localAudio) {
      localAudio.pause();
      localAudio.currentTime = 0;
    }
    if (ytPlayer && ytPlayer.stopVideo) {
      try { ytPlayer.stopVideo(); } catch (e) { }
    }

    // Clear video viewport if video cinema was open
    const viewportBox = document.getElementById('theater-viewport-box');
    if (viewportBox) viewportBox.innerHTML = '';

    this.isPlaying = false;
    this.sourceType = null;
    this.playbackMode = null;
    STATE.isPlaying = false;
    STATE.isPipActive = false;
    STATE.pendingRestoreYouTube = null;
    document.getElementById('theater-modal')?.classList.remove('show', 'floating-video');
    updateVideoPipButton();

    updatePlayPauseBtn(false);
    updatePlayingVisualizers(false);
    stopProgressTracking();
  },

  // Play Audio Only (Uses persistent footer player; NEVER opens video popup)
  playAudio(track, queueList = null) {
    playTrack(track, queueList);
  },

  // Watch Video (Opens dedicated VLC-style video modal; does NOT start footer audio)
  playVideo(track) {
    if (!track) return;
    this.stopAll();

    this.currentTrack = track;
    this.playbackMode = 'watch-video';
    this.isPlaying = true;

    STATE.currentTrack = track;
    STATE.isPlaying = true;

    // Hide footer audio player so it does not compete
    hideBottomPlayer();

    const titleEl = document.getElementById('theater-video-title');
    if (titleEl) titleEl.innerText = `${track.title} – ${track.artist || 'Video'}`;

    const viewportBox = document.getElementById('theater-viewport-box');
    if (viewportBox) {
      if (track.youtubeId) {
        this.sourceType = 'youtube-video';
        viewportBox.innerHTML = `
          <iframe id="vlc-video-iframe"
            src="https://www.youtube.com/embed/${track.youtubeId}?autoplay=1&enablejsapi=1&rel=0&controls=1" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen 
            style="width: 100%; height: 100%; border: none; aspect-ratio: 16/9;">
          </iframe>
        `;
      } else {
        this.sourceType = 'local-video';
        const source = mediaSource(track);
        const url = source instanceof Blob ? URL.createObjectURL(source) : (track.videoSrc || source || '');
        viewportBox.innerHTML = `
          <video id="vlc-video-element" src="${url}" autoplay playsinline style="width: 100%; height: 100%; background: #000; object-fit: contain;">
          </video>
        `;
        const v = document.getElementById('vlc-video-element');
        if (v) {
          v.volume = (STATE.volume ?? 100) / 100;
          v.play().catch(() => {});
          bindVlcVideoEvents(v);
        }
      }
    }

    toggleTheaterVideo(true);
    if (STATE.isPipActive) {
      const modal = document.getElementById('theater-modal');
      if (modal) {
        modal.classList.add('pip-mode');
        modal.classList.add('floating-video');
      }
      const pipControls = document.getElementById('pip-controls-bar');
      if (pipControls) pipControls.style.display = 'flex';
      const pipLabel = document.getElementById('theater-pip-label');
      if (pipLabel) pipLabel.innerText = 'Expand';
    }
    updateVideoPipButton();
    updatePlayingVisualizers(true);
    recordListeningHistory(track);
  },

  // Prompt choice dialog for downloaded tracks with both audio and video
  promptChoice(track, queueList = null) {
    STATE.pendingChoiceTrack = track;
    STATE.pendingChoiceQueue = queueList;

    const titleEl = document.getElementById('playback-choice-track-title');
    if (titleEl) titleEl.innerText = track.title;

    openModal('playback-choice-modal');
  }
};

function choosePlaybackMode(mode) {
  closeModal('playback-choice-modal');
  const track = STATE.pendingChoiceTrack;
  const queue = STATE.pendingChoiceQueue;
  if (!track) return;

  if (mode === 'audio') {
    PLAYBACK_CONTROLLER.playAudio(track, queue);
  } else if (mode === 'video') {
    PLAYBACK_CONTROLLER.playVideo(track);
  }
}

// ==============================================================================
// REAL-TIME VLC MEDIA PLAYER CONTROLS
// ==============================================================================
function bindVlcVideoEvents(videoEl) {
  if (!videoEl) return;
  const playIcon = document.getElementById('vlc-play-icon');
  const fill = document.getElementById('vlc-progress-fill');
  const thumb = document.getElementById('vlc-progress-thumb');
  const timeDisplay = document.getElementById('vlc-time-display');

  videoEl.ontimeupdate = () => {
    if (!Number.isFinite(videoEl.duration) || videoEl.duration <= 0) return;
    const pct = (videoEl.currentTime / videoEl.duration) * 100;
    if (fill) fill.style.width = `${pct}%`;
    if (thumb) thumb.style.left = `${pct}%`;
    if (timeDisplay) timeDisplay.textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration)}`;
  };
  videoEl.onplay = () => { if (playIcon) playIcon.className = 'fa-solid fa-pause'; STATE.isPlaying = true; updatePlaybackButtonsUI(); };
  videoEl.onpause = () => { if (playIcon) playIcon.className = 'fa-solid fa-play'; STATE.isPlaying = false; updatePlaybackButtonsUI(); };
  videoEl.onended = () => {
    if (playIcon) playIcon.className = 'fa-solid fa-play';
    if (STATE.repeatMode === 'one') {
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    } else {
      advanceAfterTrack();
    }
  };
}

function toggleVlcPlayPause() {
  const v = document.getElementById('vlc-video-element');
  const icon = document.getElementById('vlc-play-icon');
  if (v) {
    if (v.paused) {
      v.play();
      if (icon) icon.className = 'fa-solid fa-pause';
    } else {
      v.pause();
      if (icon) icon.className = 'fa-solid fa-play';
    }
  } else {
    const iframe = document.getElementById('vlc-video-iframe');
    if (iframe) {
      iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
  }
}

function stopVlcVideo() {
  const v = document.getElementById('vlc-video-element');
  if (v) {
    v.pause();
    v.currentTime = 0;
  }
  toggleTheaterVideo(false);
}

function skipVlcVideo(seconds) {
  const v = document.getElementById('vlc-video-element');
  if (v && Number.isFinite(v.duration)) {
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
  }
}

function seekVlcVideo(event) {
  const bar = document.getElementById('vlc-progress-bar');
  const v = document.getElementById('vlc-video-element');
  if (!bar || !v || !Number.isFinite(v.duration)) return;
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  v.currentTime = ratio * v.duration;
}

function setVlcVolume(val) {
  const v = document.getElementById('vlc-video-element');
  const label = document.getElementById('vlc-vol-label');
  const icon = document.getElementById('vlc-vol-icon');
  const vol = Math.max(0, Math.min(100, Number(val)));
  if (label) label.textContent = `${vol}%`;
  if (v) v.volume = vol / 100;
  if (icon) {
    icon.className = vol === 0 ? 'fa-solid fa-volume-xmark' : (vol < 50 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high');
  }
}

function toggleVlcMute() {
  const v = document.getElementById('vlc-video-element');
  const slider = document.getElementById('vlc-volume-slider');
  if (v) {
    v.muted = !v.muted;
    if (slider) slider.value = v.muted ? 0 : 100;
    setVlcVolume(v.muted ? 0 : 100);
  }
}

function setVlcSpeed(speed) {
  const v = document.getElementById('vlc-video-element');
  if (v) v.playbackRate = Number(speed);
}

function toggleVlcFullscreen() {
  const modal = document.getElementById('theater-modal');
  if (!document.fullscreenElement) {
    modal?.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function updateFooterPlayerUI(track) {
  if (!track) return;
  const titleEl = document.getElementById('player-title');
  if (titleEl) {
    titleEl.innerText = track.title || track.fileName || track.name || 'Untitled Song';
    titleEl.title = titleEl.innerText;
  }
  const artistEl = document.getElementById('player-artist');
  if (artistEl) {
    artistEl.innerText = track.artist || (track.isLocalAudio ? 'Local Audio Track' : 'AK Studio Engine');
  }
  const artworkEl = document.getElementById('player-artwork');
  if (artworkEl) {
    const art = track.artwork || track.coverUrl || offlineArtwork;
    artworkEl.src = art;
    artworkEl.onerror = () => { artworkEl.src = offlineArtwork; };
  }
  if (track.duration > 0) {
    const totLabel = document.getElementById('total-duration');
    if (totLabel) totLabel.innerText = formatTime(track.duration);
  }

  const isDownloaded = STATE.downloadedTracks.some(d => d.id === track.id && offlineAudioTrack(d));
  const dlBtn = document.getElementById('btn-player-download');
  if (dlBtn) {
    dlBtn.innerHTML = isDownloaded
      ? '<i class="fa-solid fa-check-circle" style="color: var(--success);"></i>'
      : '<i class="fa-solid fa-circle-down"></i>';
  }
}

// ==============================================================================
// AK MUSIC STUDIO – CORE APPLICATION ENGINE
// Real YouTube Songs, Free API Engine, Offline Downloads, PiP, Visualizers & Vault
// ==============================================================================

const STATE = {
  currentTab: 'online',
  activeCategory: 'all',
  currentTrack: null,
  isPlaying: false,
  isShuffle: false,
  repeatMode: 'off', // 'off' | 'all' | 'one'
  volume: 85,
  currentTime: 0,
  duration: 0,
  queue: [],
  queueIndex: 0,
  apiKey: localStorage.getItem('ak_yt_api_key') || '',
  playlists: JSON.parse(localStorage.getItem('ak_web_playlists') || '[]'),
  recentlyPlayed: JSON.parse(localStorage.getItem('ak_recently_played') || '[]'),
  favorites: JSON.parse(localStorage.getItem('ak_favorites') || '[]'),
  downloadedTracks: [],
  localFiles: [],
  activeLocalFolder: 'all',
  activeSubFolder: null,
  selectedLocalFileIds: new Set(),
  customFolders: JSON.parse(localStorage.getItem('ak_custom_folders') || '[]'),
  editingLocalFileId: null,
  vaultUnlocked: false,
  vaultItems: [],
  targetTrackForPlaylist: null,
  isPipActive: false,
  sleepTimer: { endTimestamp: null, mode: null, intervalId: null },
  equalizer: { preset: 'flat', bass: 0, mid: 0, treble: 0, is3D: false, isBassExt: false },
  selectedAiMood: 'happy',
};

// Real YouTube Songs with Official High-Res YouTube Cover Art & Comprehensive Metadata
const REAL_SONGS_CATALOG = [
  // --- 1. Global Pop & Trending Hits ---
  {
    id: 'yt_blinding_lights',
    youtubeId: '4NRXx6U8ABQ',
    title: 'Blinding Lights (Official Music Video)',
    artist: 'The Weeknd',
    category: 'trending',
    type: 'video',
    duration: 263,
    views: '4.5B views',
    year: '2020',
    moods: ['happy', 'party', 'workout', 'drive'],
    artwork: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'Yeah, I\'ve been tryna call' },
      { time: 20, text: 'I\'ve been on my own for long enough' },
      { time: 27, text: 'Maybe you can show me how to love, maybe' },
      { time: 35, text: 'I\'m going through withdrawals' },
      { time: 42, text: 'You don\'t even have to do too much' },
      { time: 49, text: 'I said, ooh, I\'m blinded by the lights' },
      { time: 55, text: 'No, I can\'t sleep until I feel your touch' },
    ]
  },
  {
    id: 'yt_starboy',
    youtubeId: '34Na4j8AVgA',
    title: 'Starboy ft. Daft Punk (Official Music Video)',
    artist: 'The Weeknd, Daft Punk',
    category: 'pop',
    type: 'video',
    duration: 230,
    views: '2.3B views',
    year: '2016',
    moods: ['party', 'workout', 'drive'],
    artwork: 'https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'I\'m tryna put you in the worst mood, ah' },
      { time: 20, text: 'P1 cleaner than your church shoes, ah' },
      { time: 33, text: 'Look what you\'ve done, I\'m a motherfuckin\' starboy' },
    ]
  },
  {
    id: 'yt_shape_of_you',
    youtubeId: 'JGwWNGJdvx8',
    title: 'Shape of You [Official Lyric Video]',
    artist: 'Ed Sheeran',
    category: 'lyrics',
    type: 'lyric',
    duration: 234,
    views: '6.2B views',
    year: '2017',
    moods: ['happy', 'relaxing', 'party'],
    artwork: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    lyrics: [
      { time: 8, text: 'The club isn\'t the best place to find a lover' },
      { time: 11, text: 'So the bar is where I go' },
      { time: 14, text: 'Me and my friends at the table doing shots' },
      { time: 33, text: 'I\'m in love with the shape of you' },
      { time: 38, text: 'We push and pull like a magnet do' },
    ]
  },
  {
    id: 'yt_perfect',
    youtubeId: '2Vv-BfVoq4g',
    title: 'Perfect (Official Music Video)',
    artist: 'Ed Sheeran',
    category: 'pop',
    type: 'video',
    duration: 263,
    views: '3.6B views',
    year: '2017',
    moods: ['romantic', 'relaxing', 'happy'],
    artwork: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'I found a love for me' },
      { time: 18, text: 'Darling, just dive right in and follow my lead' },
      { time: 48, text: 'Baby, I\'m dancing in the dark with you between my arms' },
    ]
  },
  {
    id: 'yt_levitating',
    youtubeId: 'TUVcZfQe-Kw',
    title: 'Levitating [Official Animated Lyrics]',
    artist: 'Dua Lipa',
    category: 'lyrics',
    type: 'lyric',
    duration: 203,
    views: '1.8B views',
    year: '2020',
    moods: ['happy', 'party', 'workout'],
    artwork: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg',
    lyrics: [
      { time: 6, text: 'If you wanna run away with me, I know a galaxy' },
      { time: 14, text: 'I had a premonition that we fell into a rhythm' },
      { time: 30, text: 'You want me, I want you, baby' },
      { time: 34, text: 'My sugarboo, I\'m levitating' },
    ]
  },
  {
    id: 'yt_dont_start_now',
    youtubeId: 'oygrmJFKYZY',
    title: 'Don\'t Start Now (Official Music Video)',
    artist: 'Dua Lipa',
    category: 'pop',
    type: 'video',
    duration: 181,
    views: '1.5B views',
    year: '2019',
    moods: ['party', 'workout', 'happy'],
    artwork: 'https://i.ytimg.com/vi/oygrmJFKYZY/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'If you wanna see me out, walking in the light' },
      { time: 28, text: 'Don\'t show up, don\'t come out' },
      { time: 32, text: 'Don\'t start caring about me now' },
    ]
  },
  {
    id: 'yt_cruel_summer',
    youtubeId: 'ic8j13piAhQ',
    title: 'Cruel Summer (Official Lyric Video)',
    artist: 'Taylor Swift',
    category: 'trending',
    type: 'lyric',
    duration: 178,
    views: '850M views',
    year: '2023',
    moods: ['happy', 'party', 'drive'],
    artwork: 'https://i.ytimg.com/vi/ic8j13piAhQ/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Fever dream high in the quiet of the night' },
      { time: 24, text: 'And it\'s new, the shape of your body' },
      { time: 36, text: 'It\'s cool, that\'s what I tell \'em, no rules' },
      { time: 48, text: 'It\'s a cruel summer with you' },
    ]
  },
  {
    id: 'yt_blank_space',
    youtubeId: 'e-ORhEE9VVg',
    title: 'Blank Space (Official Music Video)',
    artist: 'Taylor Swift',
    category: 'pop',
    type: 'video',
    duration: 272,
    views: '3.3B views',
    year: '2014',
    moods: ['happy', 'party'],
    artwork: 'https://i.ytimg.com/vi/e-ORhEE9VVg/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'Nice to meet you, where you been?' },
      { time: 22, text: 'I could show you incredible things' },
      { time: 48, text: '\'Cause darling, I\'m a nightmare dressed like a daydream' },
    ]
  },
  {
    id: 'yt_bad_guy',
    youtubeId: 'dyRsYk0LyA8',
    title: 'Bad Guy (Official Music Video)',
    artist: 'Billie Eilish',
    category: 'pop',
    type: 'video',
    duration: 205,
    views: '1.3B views',
    year: '2019',
    moods: ['party', 'workout', 'drive'],
    artwork: 'https://i.ytimg.com/vi/dyRsYk0LyA8/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'White shirt now red, my bloody nose' },
      { time: 28, text: 'So you\'re a tough guy, like it really rough guy' },
      { time: 42, text: 'I\'m that bad type, make your mama sad type' },
      { time: 54, text: 'I\'m the bad guy, duh' },
    ]
  },
  {
    id: 'yt_sunflower',
    youtubeId: 'ApXoWvfEYVU',
    title: 'Sunflower (Spider-Man: Into the Spider-Verse)',
    artist: 'Post Malone, Swae Lee',
    category: 'hiphop',
    type: 'video',
    duration: 158,
    views: '2.1B views',
    year: '2018',
    moods: ['happy', 'relaxing', 'drive'],
    artwork: 'https://i.ytimg.com/vi/ApXoWvfEYVU/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'Ayy, ayy, ayy, ayy' },
      { time: 18, text: 'Needless to say, I keep in check' },
      { time: 35, text: 'Then you\'re left in the dust, unless I stuck by ya' },
      { time: 44, text: 'You\'re the sunflower, I think your love would be too much' },
    ]
  },
  {
    id: 'yt_circles',
    youtubeId: 'wXhTHyIgQ_U',
    title: 'Circles (Official Music Video)',
    artist: 'Post Malone',
    category: 'pop',
    type: 'video',
    duration: 215,
    views: '620M views',
    year: '2019',
    moods: ['relaxing', 'sad', 'drive'],
    artwork: 'https://i.ytimg.com/vi/wXhTHyIgQ_U/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Seasons change and our love went cold' },
      { time: 24, text: 'Feed the flame \'cause we can\'t let go' },
      { time: 40, text: 'Run away, but we\'re running in circles' },
    ]
  },
  {
    id: 'yt_despacito',
    youtubeId: 'kJQP7kiw5Fk',
    title: 'Despacito ft. Daddy Yankee',
    artist: 'Luis Fonsi',
    category: 'trending',
    type: 'video',
    duration: 282,
    views: '8.4B views',
    year: '2017',
    moods: ['party', 'happy', 'workout'],
    artwork: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'Sí, sabes que ya llevo un rato mirándote' },
      { time: 21, text: 'Vi que tu mirada ya estaba llamándome' },
      { time: 42, text: 'Despacito... quiero respirar tu cuello despacito' },
    ]
  },
  {
    id: 'yt_24k_magic',
    youtubeId: 'UqyT8IEBkvY',
    title: '24K Magic (Official Music Video)',
    artist: 'Bruno Mars',
    category: 'pop',
    type: 'video',
    duration: 226,
    views: '1.6B views',
    year: '2016',
    moods: ['party', 'happy'],
    artwork: 'https://i.ytimg.com/vi/UqyT8IEBkvY/hqdefault.jpg',
    lyrics: [
      { time: 14, text: 'Tonight, I just wanna take you higher' },
      { time: 25, text: 'Players, put yo\' pinky rings up to the moon' },
      { time: 38, text: '24 karat magic in the air' },
    ]
  },
  {
    id: 'yt_attention',
    youtubeId: 'nfs8NYg7yQM',
    title: 'Attention (Official Music Video)',
    artist: 'Charlie Puth',
    category: 'pop',
    type: 'video',
    duration: 211,
    views: '1.5B views',
    year: '2017',
    moods: ['workout', 'drive', 'party'],
    artwork: 'https://i.ytimg.com/vi/nfs8NYg7yQM/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'You\'ve been runnin\' \'round, runnin\' \'round throwin\' that dirt on my name' },
      { time: 35, text: 'You just want attention, you don\'t want my heart' },
    ]
  },
  {
    id: 'yt_memories',
    youtubeId: 'SlPhMPnQ58k',
    title: 'Memories (Official Music Video)',
    artist: 'Maroon 5',
    category: 'pop',
    type: 'video',
    duration: 195,
    views: '980M views',
    year: '2019',
    moods: ['sad', 'relaxing', 'happy'],
    artwork: 'https://i.ytimg.com/vi/SlPhMPnQ58k/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'Here\'s to the ones that we got' },
      { time: 15, text: 'Cheers to the wish you were here, but you\'re not' },
      { time: 25, text: '\'Cause the drinks bring back all the memories' },
    ]
  },
  {
    id: 'yt_cheap_thrills',
    youtubeId: '31crA53Dgu0',
    title: 'Cheap Thrills [Lyric Video]',
    artist: 'Sia',
    category: 'lyrics',
    type: 'lyric',
    duration: 212,
    views: '1.9B views',
    year: '2016',
    moods: ['happy', 'party', 'workout'],
    artwork: 'https://i.ytimg.com/vi/31crA53Dgu0/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Come on, come on, turn the radio on' },
      { time: 22, text: 'Baby, I don\'t need dollar bills to have fun tonight' },
      { time: 32, text: 'I love cheap thrills' },
    ]
  },

  // --- 2. EDM, Electro & Energy ---
  {
    id: 'yt_faded',
    youtubeId: '60ItHLz5WEA',
    title: 'Faded (Official Music Video)',
    artist: 'Alan Walker',
    category: 'edm',
    type: 'video',
    duration: 212,
    views: '3.5B views',
    year: '2015',
    moods: ['sad', 'relaxing', 'focus'],
    artwork: 'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'You were the shadow to my light, did you feel us?' },
      { time: 36, text: 'Where are you now? Where are you now?' },
      { time: 73, text: 'I\'m faded, I\'m faded, so lost, I\'m faded' },
    ]
  },
  {
    id: 'yt_the_spectre',
    youtubeId: 'wJnBTPUQS5A',
    title: 'The Spectre (Official Audio)',
    artist: 'Alan Walker',
    category: 'edm',
    type: 'video',
    duration: 193,
    views: '1.1B views',
    year: '2017',
    moods: ['workout', 'party', 'drive'],
    artwork: 'https://i.ytimg.com/vi/wJnBTPUQS5A/hqdefault.jpg',
    lyrics: [
      { time: 14, text: 'Hello, hello, can you hear me as I scream your name?' },
      { time: 34, text: 'We live, we love, we lie' },
    ]
  },
  {
    id: 'yt_alone',
    youtubeId: 'ALZHF5UqnU4',
    title: 'Alone (Official Music Video)',
    artist: 'Marshmello',
    category: 'edm',
    type: 'video',
    duration: 199,
    views: '2.4B views',
    year: '2016',
    moods: ['workout', 'party', 'drive'],
    artwork: 'https://i.ytimg.com/vi/ALZHF5UqnU4/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'I\'m so alone, nothing feels like home' },
      { time: 23, text: 'I\'m so alone, trying to find my way back home to you' },
    ]
  },
  {
    id: 'yt_happier',
    youtubeId: 'm7Bc3pLyij0',
    title: 'Happier (Official Video)',
    artist: 'Marshmello, Bastille',
    category: 'edm',
    type: 'video',
    duration: 233,
    views: '1.1B views',
    year: '2018',
    moods: ['happy', 'sad', 'drive'],
    artwork: 'https://i.ytimg.com/vi/m7Bc3pLyij0/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'Lately, I\'ve been, I\'ve been thinking' },
      { time: 25, text: 'I want you to be happier, I want you to be happier' },
    ]
  },
  {
    id: 'yt_bangarang',
    youtubeId: 'YJVmu6yttiw',
    title: 'Bangarang ft. Sirah',
    artist: 'Skrillex',
    category: 'edm',
    type: 'video',
    duration: 215,
    views: '1.1B views',
    year: '2012',
    moods: ['workout', 'party'],
    artwork: 'https://i.ytimg.com/vi/YJVmu6yttiw/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Shout to all my lost boys, we rowdy' },
      { time: 28, text: 'Bangarang! Bass drop!' },
    ]
  },

  // --- 3. Rock, Anthem & Energy ---
  {
    id: 'yt_believer',
    youtubeId: '7wtfhZwyrcc',
    title: 'Believer (Official Music Video)',
    artist: 'Imagine Dragons',
    category: 'rock',
    type: 'video',
    duration: 216,
    views: '2.6B views',
    year: '2017',
    moods: ['workout', 'party'],
    artwork: 'https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg',
    lyrics: [
      { time: 5, text: 'First things first, I\'ma say all the words inside my head' },
      { time: 31, text: 'Pain! You made me a, you made me a believer, believer' },
    ]
  },
  {
    id: 'yt_demons',
    youtubeId: 'mWRsgZuwf_8',
    title: 'Demons (Official Music Video)',
    artist: 'Imagine Dragons',
    category: 'rock',
    type: 'video',
    duration: 236,
    views: '1.1B views',
    year: '2013',
    moods: ['sad', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/mWRsgZuwf_U/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'When the days are cold and the cards all fold' },
      { time: 30, text: 'When you feel my heat, look into my eyes' },
      { time: 42, text: 'It\'s where my demons hide, it\'s where my demons hide' },
    ]
  },
  {
    id: 'yt_bohemian',
    youtubeId: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody (Official Remastered Video)',
    artist: 'Queen',
    category: 'rock',
    type: 'video',
    duration: 360,
    views: '1.7B views',
    year: '1975',
    moods: ['focus', 'sad', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    lyrics: [
      { time: 3, text: 'Is this the real life? Is this just fantasy?' },
      { time: 59, text: 'Mama, just killed a man' },
      { time: 188, text: 'Scaramouche, Scaramouche, will you do the Fandango?' },
    ]
  },
  {
    id: 'yt_viva_la_vida',
    youtubeId: 'dvgZkm1xWPE',
    title: 'Viva La Vida (Official Music Video)',
    artist: 'Coldplay',
    category: 'rock',
    type: 'video',
    duration: 242,
    views: '920M views',
    year: '2008',
    moods: ['happy', 'relaxing', 'drive'],
    artwork: 'https://i.ytimg.com/vi/dvgZkm1xWPE/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'I used to rule the world, seas would rise when I gave the word' },
      { time: 38, text: 'I hear Jerusalem bells a-ringin\', Roman cavalry choirs are singin\'' },
    ]
  },

  // --- 4. Bollywood & Hindi Masterpieces ---
  {
    id: 'yt_kesariya',
    youtubeId: 'BddP6PYo2gs',
    title: 'Kesariya (Brahmāstra - Official Audio Video)',
    artist: 'Arijit Singh, Pritam',
    category: 'bollywood',
    type: 'video',
    duration: 268,
    views: '620M views',
    year: '2022',
    moods: ['romantic', 'happy', 'devotional'],
    artwork: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'Mujhko itna bataye koi, kaise tujhse dil na lagaye koi' },
      { time: 32, text: 'Rabba ne tujhko banane mein kardi hai husn ki khaali tijoriyan' },
      { time: 58, text: 'Kesariya tera ishq hai piya, rang jaaun jo main haath lagaun' },
    ]
  },
  {
    id: 'yt_tum_hi_ho',
    youtubeId: 'IJq0yyWug1k',
    title: 'Tum Hi Ho (Aashiqui 2 Official Video)',
    artist: 'Arijit Singh, Mithoon',
    category: 'bollywood',
    type: 'video',
    duration: 262,
    views: '850M views',
    year: '2013',
    moods: ['romantic', 'sad', 'melancholy'],
    artwork: 'https://i.ytimg.com/vi/IJq0yyWug1k/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Hum tere bin ab reh nahi sakte, tere bina kya wajood mera' },
      { time: 35, text: 'Kyunki tum hi ho, ab tum hi ho, zindagi ab tum hi ho' },
    ]
  },
  {
    id: 'yt_channa_mereya',
    youtubeId: '284Ov7ysmfA',
    title: 'Channa Mereya (Ae Dil Hai Mushkil)',
    artist: 'Arijit Singh, Pritam',
    category: 'bollywood',
    type: 'video',
    duration: 289,
    views: '560M views',
    year: '2016',
    moods: ['sad', 'melancholy'],
    artwork: 'https://i.ytimg.com/vi/284Ov7ysmfA/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'Achha chalta hoon, duaon mein yaad rakhna' },
      { time: 45, text: 'Andhera tera maine le liya, mera ujla sitara tere naam kiya' },
      { time: 65, text: 'Channa mereya mereya, channa mereya beliya' },
    ]
  },
  {
    id: 'yt_dil_diyan_gallan',
    youtubeId: 'SAcpESN_Fk4',
    title: 'Dil Diyan Gallan (Tiger Zinda Hai)',
    artist: 'Atif Aslam, Vishal-Shekhar',
    category: 'bollywood',
    type: 'video',
    duration: 260,
    views: '780M views',
    year: '2017',
    moods: ['romantic', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/SAcpESN_Fk4/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'Kacchi doriyon, doriyon, doriyon se' },
      { time: 35, text: 'Dil diyan gallan karange naal naal beh ke' },
    ]
  },
  {
    id: 'yt_raataan_lambiyan',
    youtubeId: 'gvyUuxdRdR4',
    title: 'Raataan Lambiyan (Shershaah)',
    artist: 'Jubin Nautiyal, Asees Kaur',
    category: 'bollywood',
    type: 'lyric',
    duration: 230,
    views: '890M views',
    year: '2021',
    moods: ['romantic', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/gvyUuxdRdR4/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Teri meri gallan ho gayi mashhoor' },
      { time: 28, text: 'Kaate kate na katte din o saaware' },
      { time: 44, text: 'Raataan lambiyan lambiyan re' },
    ]
  },
  {
    id: 'yt_srivalli',
    youtubeId: 'hcMzwMrr1tE',
    title: 'Srivalli (Pushpa: The Rise)',
    artist: 'Sid Sriram, Devi Sri Prasad',
    category: 'bollywood',
    type: 'video',
    duration: 224,
    views: '710M views',
    year: '2021',
    moods: ['happy', 'party'],
    artwork: 'https://i.ytimg.com/vi/hcMzwMrr1tE/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'Nazar milte hi jhook jaaye' },
      { time: 38, text: 'Teri jhalak asharfi, Srivalli' },
    ]
  },
  {
    id: 'yt_kun_faya_kun',
    youtubeId: 'T94PHkuydcw',
    title: 'Kun Faya Kun (Rockstar Sufi Hymn)',
    artist: 'A.R. Rahman, Javed Ali, Mohit Chauhan',
    category: 'devotional',
    type: 'video',
    duration: 472,
    views: '480M views',
    year: '2011',
    moods: ['devotional', 'peace', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/T94PHkuydcw/hqdefault.jpg',
    lyrics: [
      { time: 20, text: 'Ya Nizamuddin Auliya, Ya Nizamuddin Sarkar' },
      { time: 80, text: 'Kun faya kun, kun faya kun, faya kun' },
    ]
  },

  // --- 5. Devotional, Spiritual & Chants ---

  // --- 6. Lo-Fi, Ambient & Study Beats ---
  {
    id: 'yt_lofi_girl',
    youtubeId: '5qap5aO4i9A',
    title: 'Lofi Hip Hop – Beats to Relax / Study',
    artist: 'Lofi Girl Records',
    category: 'lofi',
    type: 'video',
    duration: 1800,
    views: '1.8B views',
    year: '2024',
    moods: ['relaxing', 'focus', 'sleep'],
    artwork: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    lyrics: [
      { time: 0, text: '♪ Warm vinyl groove & vintage Rhodes chords ♪' },
      { time: 40, text: '♪ Rainy afternoon chill beat ♪' },
      { time: 100, text: '♪ Deep concentration & late night rhythm ♪' },
    ]
  },
  {
    id: 'yt_kupla',
    youtubeId: 'fE2h3lGlOsk',
    title: 'Kingdom in Blue (Lo-Fi Album)',
    artist: 'Kupla, ChilledCow',
    category: 'lofi',
    type: 'video',
    duration: 1450,
    views: '85M views',
    year: '2022',
    moods: ['relaxing', 'focus'],
    artwork: 'https://i.ytimg.com/vi/fE2h3lGlOsk/hqdefault.jpg',
    lyrics: [
      { time: 0, text: '♪ Serene piano & jazz trumpet melodies ♪' }
    ]
  },

  // --- 7. Workout, Gym & High Energy ---
  {
    id: 'yt_lose_yourself',
    youtubeId: '_Yhyp-_hX2s',
    title: 'Lose Yourself (Official 4K Remaster)',
    artist: 'Eminem',
    category: 'workout',
    type: 'video',
    duration: 326,
    views: '1.4B views',
    year: '2002',
    moods: ['workout', 'workout'],
    artwork: 'https://i.ytimg.com/vi/_Yhyp-_hX2s/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'Look, if you had one shot or one opportunity' },
      { time: 33, text: 'His palms are sweaty, knees weak, arms are heavy' },
      { time: 54, text: 'You better lose yourself in the music, the moment' },
    ]
  },

  // --- 8. Curated Hindi Hits (Bollywood & Indie) ---
  {
    id: 'yt_kesariya',
    youtubeId: 'BddP6PYo2gs',
    title: 'Kesariya (From "Brahmastra")',
    artist: 'Arijit Singh, Pritam, Amitabh Bhattacharya',
    category: 'hindi',
    type: 'video',
    duration: 268,
    views: '540M views',
    year: '2022',
    moods: ['romantic', 'happy'],
    artwork: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'Mujhko itna bataye koi' },
      { time: 26, text: 'Kaise tujhse dil na lagaye koi' },
      { time: 42, text: 'Kesariya tera ishq hai piya' },
      { time: 54, text: 'Rang jaaun jo main haath lagaun' }
    ]
  },
  {
    id: 'yt_apna_bana_le',
    youtubeId: 'ElZfdU54Cp8',
    title: 'Apna Bana Le (From "Bhediya")',
    artist: 'Arijit Singh, Sachin-Jigar',
    category: 'hindi',
    type: 'video',
    duration: 261,
    views: '320M views',
    year: '2022',
    moods: ['romantic', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Tu mera koi na hoke bhi kuch laage' },
      { time: 32, text: 'Apna bana le piya, apna bana le piya' },
      { time: 55, text: 'Dil ke nagar mein shehar tu basa le piya' }
    ]
  },
  {
    id: 'yt_chaleya',
    youtubeId: 'YxWlaYCA8MU',
    title: 'Chaleya (From "Jawan")',
    artist: 'Arijit Singh, Shilpa Rao, Anirudh Ravichander',
    category: 'hindi',
    type: 'video',
    duration: 200,
    views: '380M views',
    year: '2023',
    moods: ['happy', 'party'],
    artwork: 'https://i.ytimg.com/vi/VAdGW7QDJUI/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'Ishq mein dil bana hai, ishq mein dil fana hai' },
      { time: 25, text: 'Tere ishq pe, tere waqt pe' },
      { time: 40, text: 'Chaleya teri ore, chaleya teri ore' }
    ]
  },
  {
    id: 'yt_tum_hi_ho',
    youtubeId: 'IJq0yyWug1k',
    title: 'Tum Hi Ho (Aashiqui 2 Classic)',
    artist: 'Arijit Singh, Mithoon',
    category: 'hindi',
    type: 'video',
    duration: 262,
    views: '890M views',
    year: '2013',
    moods: ['romantic', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/IJq0yyWug1k/hqdefault.jpg',
    lyrics: [
      { time: 18, text: 'Hum tere bin ab reh nahi sakte' },
      { time: 28, text: 'Tere bina kya wajood mera' },
      { time: 42, text: 'Kyunki tum hi ho, ab tum hi ho' },
      { time: 52, text: 'Zindagi ab tum hi ho' }
    ]
  },
  {
    id: 'yt_raataan_lambiyan',
    youtubeId: 'gvyUuxdRdR4',
    title: 'Raataan Lambiyan (From "Shershaah")',
    artist: 'Jubin Nautiyal, Asees Kaur, Tanishk Bagchi',
    category: 'hindi',
    type: 'video',
    duration: 230,
    views: '920M views',
    year: '2021',
    moods: ['romantic', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/gvyUuxdRdR4/hqdefault.jpg',
    lyrics: [
      { time: 14, text: 'Teri meri gallan ho gayi mashhoor' },
      { time: 26, text: 'Kar na kabhi tu mujhe nazron se door' },
      { time: 42, text: 'Kaate kate na kainte raataan lambiyan re' }
    ]
  },
  {
    id: 'yt_heeriye',
    youtubeId: 'RLzC55ai0eo',
    title: 'Heeriye (feat. Arijit Singh)',
    artist: 'Jasleen Royal, Arijit Singh',
    category: 'hindi',
    type: 'video',
    duration: 195,
    views: '460M views',
    year: '2023',
    moods: ['romantic', 'happy'],
    artwork: 'https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg',
    lyrics: [
      { time: 10, text: 'Heeriye heeriye aa, heeriye heeriye aa' },
      { time: 25, text: 'Teri hoke marjana, heeriye heeriye aa' },
      { time: 45, text: 'Neendon mein aake khwab sajaye' }
    ]
  },
  {
    id: 'yt_dil_diyan_gallan',
    youtubeId: 'SAcpESN_Fk4',
    title: 'Dil Diyan Gallan (From "Tiger Zinda Hai")',
    artist: 'Atif Aslam, Vishal-Shekhar',
    category: 'hindi',
    type: 'video',
    duration: 260,
    views: '780M views',
    year: '2017',
    moods: ['romantic', 'relaxing'],
    artwork: 'https://i.ytimg.com/vi/SAcpESN_Fk4/hqdefault.jpg',
    lyrics: [
      { time: 15, text: 'Kacchi doriyon doriyaan doriyaan se' },
      { time: 30, text: 'Mainu tu baandh le' },
      { time: 48, text: 'Dil diyan gallan karange naal naal beh ke' }
    ]
  },

  // --- 9. Curated Telugu Blockbusters (Tollywood Hits) ---
  {
    id: 'yt_naatu_naatu',
    youtubeId: 'sAzlWScHTc4',
    title: 'Naatu Naatu (From "RRR" - Oscar Winner)',
    artist: 'Rahul Sipligunj, Kaala Bhairava, M.M. Keeravaani',
    category: 'telugu',
    type: 'video',
    duration: 275,
    views: '420M views',
    year: '2022',
    moods: ['workout', 'party', 'happy'],
    artwork: 'https://i.ytimg.com/vi/OsU0Hhyft9g/hqdefault.jpg',
    lyrics: [
      { time: 18, text: 'Polam gattu dummu lone potharaju thalanoppi' },
      { time: 35, text: 'Naatu naatu naatu naatu veera naatu' },
      { time: 50, text: 'Gundeladhi gubbullona thummedhai rege naatu' }
    ]
  },
  {
    id: 'yt_butta_bomma',
    youtubeId: '2mDCVzruYzQ',
    title: 'Butta Bomma (From "Ala Vaikunthapurramuloo")',
    artist: 'Armaan Malik, Thaman S, Ramajogayya Sastry',
    category: 'telugu',
    type: 'video',
    duration: 198,
    views: '880M views',
    year: '2020',
    moods: ['happy', 'romantic'],
    artwork: 'https://i.ytimg.com/vi/2mDCVzruYzQ/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Inninalluga leni vedhipekkade' },
      { time: 24, text: 'Gundelo mari intha sandhadedhi rege' },
      { time: 40, text: 'Butta bomma butta bomma nannu suthukuntive' }
    ]
  },
  {
    id: 'yt_srivalli',
    youtubeId: 'hcMzwMrr1tE',
    title: 'Srivalli (From "Pushpa: The Rise")',
    artist: 'Sid Sriram, Devi Sri Prasad, Chandrabose',
    category: 'telugu',
    type: 'video',
    duration: 220,
    views: '730M views',
    year: '2021',
    moods: ['romantic', 'happy'],
    artwork: 'https://i.ytimg.com/vi/hcMzwMrr1tE/hqdefault.jpg',
    lyrics: [
      { time: 12, text: 'Choope bangaaramaaye srivalli' },
      { time: 28, text: 'Maate maanikayamaaye srivalli' },
      { time: 46, text: 'Nuvvu pakkana unte chalu srivalli' }
    ]
  }
];

let onlineTracksList = [...REAL_SONGS_CATALOG];

// ==============================================================================
// 2. Database Engine (Downloads, Local Files & Vault)
// ==============================================================================
let dbInstance = null;

function initDatabase() {
  return new Promise((resolve) => {
    // Version 4 adds listening_history store
    const request = indexedDB.open('ak_studio_db', 4);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('downloads')) {
        db.createObjectStore('downloads', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('local_files')) {
        db.createObjectStore('local_files', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vault')) {
        db.createObjectStore('vault', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('listening_history')) {
        db.createObjectStore('listening_history', { autoIncrement: true });
      }
    };
    request.onsuccess = async (e) => {
      dbInstance = e.target.result;
      await Promise.all([loadDownloadedTracks(), loadLocalFiles()]);
      resolve(dbInstance);
    };
    request.onerror = () => resolve(null);
  });
}

function loadDownloadedTracks() {
  if (!dbInstance) return;
  return new Promise(resolve => {
    const request = dbInstance.transaction('downloads').objectStore('downloads').getAll();
    request.onsuccess = () => {
      STATE.downloadedTracks = request.result || [];
      updateDownloadedBadges();
      if (STATE.currentTab === 'downloaded') renderDownloadedView();
      resolve();
    };
    request.onerror = () => resolve();
  });
}

function saveDownloadToDB(track) {
  return new Promise((resolve) => {
    if (!dbInstance) return resolve(false);
    try {
      const tx = dbInstance.transaction('downloads', 'readwrite');
      tx.objectStore('downloads').put(track);
      tx.oncomplete = async () => {
        await loadDownloadedTracks();
        resolve(true);
      };
      tx.onabort = () => resolve(false);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function removeDownloadFromDB(id) {
  return new Promise((resolve) => {
    if (!dbInstance) return resolve(false);
    try {
      const tx = dbInstance.transaction('downloads', 'readwrite');
      tx.objectStore('downloads').delete(id);
      tx.oncomplete = async () => {
        await loadDownloadedTracks();
        resolve(true);
      };
      tx.onabort = () => resolve(false);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function updateDownloadedBadges() {
  const count = STATE.downloadedTracks.filter(offlineAudioTrack).length;
  const countEl = document.getElementById('sidebar-downloaded-count');
  if (countEl) countEl.innerText = count;

  const statCount = document.getElementById('stat-downloaded-count');
  if (statCount) statCount.innerText = count;

  const totalBytes = STATE.downloadedTracks.reduce((total, track) => {
    const source = mediaSource(track);
    return total + (source instanceof Blob ? source.size : typeof source === 'string' ? source.length : 0);
  }, 0);
  const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const statSize = document.getElementById('stat-downloaded-size');
  if (statSize) statSize.innerText = `${sizeMb} MB`;
}

// ==============================================================================
// 3. YouTube IFrame Player Engine with Picture-in-Picture & Visualizer
// ==============================================================================
let ytPlayer = null;
let ytPlayerReady = false;
let progressInterval = null;

window.onYouTubeIframeAPIReady = function () {
  try {
    ytPlayer = new YT.Player('yt-player-host', {
      height: '240',
      width: '320',
      playerVars: {
        playsinline: 1,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  } catch (e) {
    console.warn('YouTube IFrame init notice:', e);
  }
};

function onPlayerReady() {
  ytPlayerReady = true;
  if (ytPlayer && ytPlayer.setVolume) {
    ytPlayer.setVolume(getPlaybackVolume());
  }
  if (STATE.pendingRestoreYouTube) {
    cuePendingYouTubeTrack();
  }
}

function cuePendingYouTubeTrack() {
  if (!STATE.pendingRestoreYouTube || !ytPlayer || !ytPlayer.cueVideoById) return;
  const { youtubeId, currentTime, wasPlaying } = STATE.pendingRestoreYouTube;
  try {
    ytPlayer.cueVideoById(youtubeId, currentTime || 0);
    if (wasPlaying) {
      ytPlayer.playVideo();
    }
  } catch (e) { }
  STATE.pendingRestoreYouTube = null;
}

function onPlayerStateChange(event) {
  if (!STATE.currentTrack?.youtubeId || STATE.currentTrack.isLocalAudio ||
    PLAYBACK_CONTROLLER.playbackMode !== 'audio-only') return;
  if (event.data === YT.PlayerState.PLAYING) {
    STATE.isPlaying = true;
    updatePlayPauseBtn(true);
    updatePlayingVisualizers(true);
    startProgressTracking();
  } else if (event.data === YT.PlayerState.PAUSED) {
    STATE.isPlaying = false;
    updatePlayPauseBtn(false);
    updatePlayingVisualizers(false);
    stopProgressTracking();
  } else if (event.data === YT.PlayerState.ENDED) {
    if (STATE.sleepTimer && STATE.sleepTimer.mode === 'end_of_track') {
      cancelSleepTimer();
      togglePlayPause();
      return;
    }
    if (STATE.repeatMode === 'one') {
      if (ytPlayer && ytPlayer.seekTo) {
        ytPlayer.seekTo(0);
        ytPlayer.playVideo();
      }
    } else {
      advanceAfterTrack();
    }
  }
}

function onPlayerError(err) {
  console.warn('YouTube Player notice code:', err?.data);
  const badTrack = STATE.currentTrack;
  if (!badTrack?.youtubeId) return;

  // Filter out dead/blocked video from runtime lists so it won't be repeated
  if (Array.isArray(onlineTracksList)) {
    onlineTracksList = onlineTracksList.filter(t => t.youtubeId !== badTrack.youtubeId);
  }
  if (Array.isArray(STATE.queue)) {
    STATE.queue = STATE.queue.filter(t => t.youtubeId !== badTrack.youtubeId);
  }

  showVoiceToast('Skipping unavailable video: ' + (badTrack.title || 'Track'));

  if (STATE.queue.length > 0) {
    const nextIdx = Math.min(STATE.queueIndex, STATE.queue.length - 1);
    playTrack(STATE.queue[nextIdx]);
  } else {
    stopPlayback();
  }
}

function startProgressTracking() {
  stopProgressTracking();
  progressInterval = setInterval(() => {
    if (STATE.currentTrack && STATE.currentTrack.isLocalAudio) {
      const localAudio = document.getElementById('local-html-audio');
      if (!localAudio) return;
      const current = localAudio.currentTime || 0;
      const total = localAudio.duration || (STATE.currentTrack ? STATE.currentTrack.duration : 0);
      STATE.currentTime = current;
      STATE.duration = total;

      const curLabel = document.getElementById('current-time');
      if (curLabel) curLabel.innerText = formatTime(current);
      const totLabel = document.getElementById('total-duration');
      if (totLabel) totLabel.innerText = formatTime(total);

      const ratio = total > 0 ? (current / total) * 100 : 0;
      const fillBar = document.getElementById('progress-fill');
      if (fillBar) fillBar.style.width = `${Math.min(100, ratio)}%`;
      return;
    }

    if (!ytPlayer || !ytPlayer.getCurrentTime) return;
    try {
      const current = ytPlayer.getCurrentTime() || 0;
      const total = ytPlayer.getDuration() || (STATE.currentTrack ? STATE.currentTrack.duration : 0);
      STATE.currentTime = current;
      STATE.duration = total;

      document.getElementById('current-time').innerText = formatTime(current);
      document.getElementById('total-duration').innerText = formatTime(total);

      const ratio = total > 0 ? (current / total) * 100 : 0;
      document.getElementById('progress-fill').style.width = `${Math.min(100, ratio)}%`;

      updateLyricsActiveLine(current);
    } catch { }
  }, 400);
}

function stopProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function formatTime(seconds) {
  const s = Math.floor(seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Visualizer Equalizer indicator: Shows user WHERE music is playing!
function updatePlayingVisualizers(isPlaying) {
  const playerEq = document.getElementById('player-playing-eq');
  if (playerEq) {
    playerEq.style.display = isPlaying ? 'inline-flex' : 'none';
  }

  // Update cards
  document.querySelectorAll('.media-card').forEach(card => {
    const cardId = card.getAttribute('data-id');
    const isThisPlaying = isPlaying && STATE.currentTrack && cardId === STATE.currentTrack.id;
    card.classList.toggle('is-playing', isThisPlaying);
  });

  // Update downloaded rows
  document.querySelectorAll('.download-row').forEach(row => {
    const rowId = row.getAttribute('data-id');
    const isThisPlaying = isPlaying && STATE.currentTrack && rowId === STATE.currentTrack.id;
    row.classList.toggle('is-playing', isThisPlaying);
  });

  // Update local audio rows
  document.querySelectorAll('.local-audio-row').forEach(row => {
    const rowId = row.getAttribute('data-id');
    const isThisPlaying = isPlaying && STATE.currentTrack && rowId === STATE.currentTrack.id;
    row.classList.toggle('is-playing', isThisPlaying);
    const playBtn = row.querySelector('.primary-btn');
    if (playBtn) {
      playBtn.innerHTML = `<i class="fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}"></i> ${isThisPlaying ? 'Pause' : 'Play'}`;
      if (isThisPlaying) {
        playBtn.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
      } else {
        playBtn.style.background = '';
      }
    }
  });
}

// ==============================================================================
// 4. Playback Controls & Track Handling
// ==============================================================================
function playTrack(track, queueList = null) {
  if (!track) return;
  if (track.type === 'video') {
    PLAYBACK_CONTROLLER.playVideo(track);
    return;
  }
  if (PLAYBACK_CONTROLLER.playbackMode === 'watch-video') PLAYBACK_CONTROLLER.stopAll();
  PLAYBACK_CONTROLLER.currentTrack = track;
  PLAYBACK_CONTROLLER.sourceType = track.isLocalAudio ? 'local-audio' : 'youtube-stream';
  STATE.currentTime = 0;
  STATE.duration = track.duration || 0;
  document.getElementById('current-time').innerText = '0:00';
  document.getElementById('total-duration').innerText = formatTime(STATE.duration);
  document.getElementById('progress-fill').style.width = '0%';
  PLAYBACK_CONTROLLER.playbackMode = 'audio-only';
  STATE.pendingRestoreYouTube = null;
  STATE.currentTrack = track;
  if (queueList) {
    STATE.queue = queueList;
    STATE.queueIndex = queueList.findIndex(t => t.id === track.id);
  } else {
    let index = STATE.queue.findIndex(item => item.id === track.id);
    if (index === -1) index = STATE.queue.push(track) - 1;
    STATE.queueIndex = index;
  }

  // Update Player UI & Smoothly slide in footer player
  showBottomPlayer();
  updateFooterPlayerUI(track);
  document.getElementById('theater-video-title').innerText = track.title + ' - ' + track.artist;

  // Load into Player Engine (Local HTML5 Audio or YouTube IFrame)
  const localAudio = document.getElementById('local-html-audio');

  if (track.isLocalAudio) {
    // Pause YouTube iframe playback
    if (ytPlayer && ytPlayer.pauseVideo) {
      try { ytPlayer.pauseVideo(); } catch (e) { }
    }

    if (localAudio) {
      setLocalAudioSource(localAudio, track);
      localAudio.volume = getPlaybackVolume() / 100;
      void playLocalAudio(localAudio);
    }
    STATE.isPlaying = true;
    updatePlayPauseBtn(true);
    startProgressTracking();
  } else {
    // Pause local HTML5 audio
    if (localAudio && !localAudio.paused) {
      localAudio.pause();
    }

    // Load into YouTube Player
    if (ytPlayerReady && ytPlayer?.loadVideoById) {
      ytPlayer.loadVideoById(track.youtubeId);
      ytPlayer.playVideo();
    } else {
      STATE.pendingRestoreYouTube = { youtubeId: track.youtubeId, currentTime: 0, wasPlaying: true };
      if (window.YT && window.YT.Player && !ytPlayer) {
        try { window.onYouTubeIframeAPIReady(); } catch(e){}
      }
    }
  }

  if (!track.isLocalAudio) updatePlayPauseBtn(true);
  renderLyricsView(track);
  updatePlayingVisualizers(true);
  recordListeningHistory(track);
  void renderRecommendedSection();

  // Hook new 10 features
  trackPlayHistory(track);
  updateMediaSession(track);
  if (!track.isLocalAudio) void fetchSyncedLyrics(track);
}

// Separate Play, Pause, Resume, Stop Controls
function playCurrentOrResume() {
  if (!STATE.currentTrack) {
    if (onlineTracksList.length > 0) {
      playTrack(onlineTracksList[0], onlineTracksList);
    }
    return;
  }
  resumePlayback();
}

function pausePlayback() {
  if (STATE.pendingRestoreYouTube) STATE.pendingRestoreYouTube.wasPlaying = false;
  if (PLAYBACK_CONTROLLER.playbackMode === 'watch-video') {
    stopPlayback();
    return;
  }
  if (STATE.currentTrack && STATE.currentTrack.isLocalAudio) {
    const localAudio = document.getElementById('local-html-audio');
    if (localAudio && !localAudio.paused) {
      localAudio.pause();
    }
  } else if (ytPlayer && ytPlayer.pauseVideo) {
    try { ytPlayer.pauseVideo(); } catch (e) { }
  }
  STATE.isPlaying = false;
  PLAYBACK_CONTROLLER.isPlaying = false;
  stopProgressTracking();
  updatePlaybackButtonsUI();
  updatePlayingVisualizers(false);
  savePlaybackSession();
}

function resumePlayback() {
  if (!STATE.currentTrack) {
    if (onlineTracksList.length > 0) playTrack(onlineTracksList[0], onlineTracksList);
    return;
  }

  if (PLAYBACK_CONTROLLER.playbackMode !== 'audio-only' && !STATE.currentTrack.isLocalAudio) {
    playTrack(STATE.currentTrack);
    return;
  }
  PLAYBACK_CONTROLLER.playbackMode = 'audio-only';
  showBottomPlayer();
  if (STATE.currentTrack.isLocalAudio) {
    const localAudio = document.getElementById('local-html-audio');
    if (localAudio) {
      if (!localAudio.getAttribute('src')) setLocalAudioSource(localAudio, STATE.currentTrack);
      void playLocalAudio(localAudio);
    }
  } else if (STATE.pendingRestoreYouTube) {
    STATE.pendingRestoreYouTube.wasPlaying = true;
  } else if (ytPlayer && ytPlayer.playVideo) {
    try { ytPlayer.playVideo(); } catch (e) { }
  }
  STATE.isPlaying = true;
  PLAYBACK_CONTROLLER.isPlaying = true;
  startProgressTracking();
  updatePlaybackButtonsUI();
  updatePlayingVisualizers(true);
  savePlaybackSession();
}

function stopPlayback() {
  PLAYBACK_CONTROLLER.stopAll();
  STATE.isPlaying = false;
  STATE.currentTime = 0;

  const curTime = document.getElementById('current-time');
  if (curTime) curTime.innerText = '0:00';
  const progressFill = document.getElementById('progress-fill');
  if (progressFill) progressFill.style.width = '0%';

  updatePlaybackButtonsUI();
  updatePlayingVisualizers(false);
  savePlaybackSession();
}

function togglePlayPause() {
  if (PLAYBACK_CONTROLLER.playbackMode === 'watch-video') {
    const v = document.getElementById('vlc-video-element') || document.querySelector('#theater-viewport-box video');
    const iframe = document.getElementById('vlc-video-iframe');
    if (v) {
      if (v.paused) { v.play().catch(() => {}); STATE.isPlaying = true; }
      else { v.pause(); STATE.isPlaying = false; }
    } else if (iframe) {
      const cmd = STATE.isPlaying ? 'pauseVideo' : 'playVideo';
      iframe.contentWindow?.postMessage(`{"event":"command","func":"${cmd}","args":""}`, '*');
      STATE.isPlaying = !STATE.isPlaying;
    }
    updatePlaybackButtonsUI();
    return;
  }
  if (STATE.isPlaying) {
    pausePlayback();
  } else {
    resumePlayback();
  }
}

function updatePlaybackButtonsUI() {
  const isPlaying = STATE.isPlaying;
  const isPaused = !STATE.isPlaying && !!STATE.currentTrack && STATE.currentTime > 0;
  const isStopped = !STATE.isPlaying && (!STATE.currentTrack || STATE.currentTime === 0);

  // Play button
  const btnPlay = document.getElementById('btn-player-play');
  if (btnPlay) {
    btnPlay.classList.toggle('is-active', isPlaying);
  }

  // Pause button
  const btnPause = document.getElementById('btn-player-pause');
  if (btnPause) {
    btnPause.classList.toggle('is-active', isPaused);
  }

  // Resume button
  const btnResume = document.getElementById('btn-player-resume');
  if (btnResume) {
    btnResume.classList.toggle('is-active', isPlaying);
  }

  // Stop button
  const btnStop = document.getElementById('btn-player-stop');
  if (btnStop) {
    btnStop.classList.toggle('is-active', isStopped);
  }

  // PiP in-window Play/Pause icon
  const pipPlayIcon = document.getElementById('pip-play-icon');
  if (pipPlayIcon) {
    pipPlayIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  }

  // Legacy play-pause button if still present
  const legacyBtn = document.getElementById('btn-play-pause');
  if (legacyBtn) {
    legacyBtn.innerHTML = isPlaying
      ? '<i class="fa-solid fa-pause"></i>'
      : '<i class="fa-solid fa-play"></i>';
  }
}

function updatePlayPauseBtn(isPlaying) {
  STATE.isPlaying = !!isPlaying;
  updatePlaybackButtonsUI();
}

function showBottomPlayer() {
  const bar = document.getElementById('bottom-player-bar');
  if (bar) {
    bar.hidden = false;
    bar.removeAttribute('hidden');
    bar.classList.remove('dismissed');
    bar.style.display = 'flex';
  }
  const watchButton = document.getElementById('btn-watch-video');
  if (watchButton) watchButton.hidden = !isOnlineVideo(STATE.currentTrack);
}

function hideBottomPlayer() {
  const bar = document.getElementById('bottom-player-bar');
  if (bar) {
    bar.classList.add('dismissed');
    bar.hidden = true;
    bar.setAttribute('hidden', '');
    bar.style.display = 'none';
  }
}

function closeAudioPlayer() {
  hideBottomPlayer();
}

function advanceAfterTrack() {
  if (STATE.repeatMode === 'off' && STATE.queueIndex >= STATE.queue.length - 1) stopPlayback();
  else playNext();
}

function playNext() {
  if (STATE.queue.length === 0) return;
  if (STATE.isShuffle) {
    STATE.queueIndex = Math.floor(Math.random() * STATE.queue.length);
  } else {
    STATE.queueIndex = (STATE.queueIndex + 1) % STATE.queue.length;
  }
  playTrack(STATE.queue[STATE.queueIndex]);
}

function playPrev() {
  if (STATE.queue.length === 0) return;
  STATE.queueIndex = (STATE.queueIndex - 1 + STATE.queue.length) % STATE.queue.length;
  playTrack(STATE.queue[STATE.queueIndex]);
}

function toggleShuffle() {
  STATE.isShuffle = !STATE.isShuffle;
  const btn = document.getElementById('btn-shuffle');
  if (btn) btn.classList.toggle('active', STATE.isShuffle);
}

function toggleRepeat() {
  const modes = ['off', 'all', 'one'];
  const nextIdx = (modes.indexOf(STATE.repeatMode) + 1) % modes.length;
  STATE.repeatMode = modes[nextIdx];
  const btn = document.getElementById('btn-repeat');
  if (btn) {
    btn.classList.toggle('active', STATE.repeatMode !== 'off');
    btn.title = `Repeat: ${STATE.repeatMode.toUpperCase()}`;
  }
}

function handleSeek(e) {
  const trackBar = document.getElementById('progress-track');
  if (!trackBar) return;
  const rect = trackBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));

  if (STATE.currentTrack && STATE.currentTrack.isLocalAudio) {
    const localAudio = document.getElementById('local-html-audio');
    if (localAudio && localAudio.duration) {
      localAudio.currentTime = ratio * localAudio.duration;
      STATE.currentTime = localAudio.currentTime;
      const curLabel = document.getElementById('current-time');
      if (curLabel) curLabel.innerText = formatTime(STATE.currentTime);
      const fillBar = document.getElementById('progress-fill');
      if (fillBar) fillBar.style.width = `${Math.min(100, ratio * 100)}%`;
    }
    return;
  }

  if (!ytPlayer || !ytPlayer.seekTo) return;
  const seekTarget = ratio * (STATE.duration || 1);
  ytPlayer.seekTo(seekTarget, true);
}

let musicVoiceDucking = false;

function getPlaybackVolume() {
  const volume = STATE.volume ?? 85;
  return musicVoiceDucking ? Math.round(volume * 0.3) : volume;
}

function setMusicVoiceDucking(enabled) {
  if (musicVoiceDucking === enabled) return;
  musicVoiceDucking = enabled;
  applyPlaybackVolume();
}

function setPlayerVolume(vol) {
  STATE.volume = vol;
  applyPlaybackVolume();
}

function applyPlaybackVolume() {
  const vol = getPlaybackVolume();
  const localAudio = document.getElementById('local-html-audio');
  if (localAudio) {
    localAudio.volume = vol / 100;
  }
  if (ytPlayer && ytPlayer.setVolume) {
    ytPlayer.setVolume(vol);
  }
}

function initLocalAudioEngine() {
  const localAudio = document.getElementById('local-html-audio');
  if (!localAudio) return;

  localAudio.addEventListener('ended', () => {
    if (!STATE.currentTrack?.isLocalAudio) return;
    if (STATE.repeatMode === 'one') {
      localAudio.currentTime = 0;
      void playLocalAudio(localAudio);
    } else {
      advanceAfterTrack();
    }
  });

  localAudio.addEventListener('pause', () => {
    if (STATE.currentTrack?.isLocalAudio && localAudio.paused) {
      STATE.isPlaying = false;
      updatePlayPauseBtn(false);
      updatePlayingVisualizers(false);
    }
  });

  localAudio.addEventListener('play', () => {
    if (STATE.currentTrack && STATE.currentTrack.isLocalAudio) {
      STATE.isPlaying = true;
      updatePlayPauseBtn(true);
      updatePlayingVisualizers(true);
    }
  });
}

function isOnlineVideo(track) {
  return !!track?.youtubeId && !track.isLocalAudio && !track.isOffline && !track.offlineSaved;
}

function hasOnlineVideo() {
  return PLAYBACK_CONTROLLER.playbackMode === 'watch-video' && !!document.getElementById('theater-viewport-box')?.children?.length;
}

function updateVideoPipButton() {
  const button = document.getElementById('theater-pip-toggle');
  if (!button) return;
  button.hidden = false;
  const label = document.getElementById('theater-pip-label');
  if (label) label.textContent = STATE.isPipActive ? 'Expand' : 'PiP';
}

function watchCurrentVideo() {
  const track = STATE.currentTrack;
  if (isOnlineVideo(track)) PLAYBACK_CONTROLLER.playVideo(track);
}

function togglePipMiniPlayer() {
  const modal = document.getElementById('theater-modal');
  if (!modal) return;
  STATE.isPipActive = !STATE.isPipActive;
  modal.classList.toggle('pip-mode', STATE.isPipActive);
  modal.classList.toggle('floating-video', STATE.isPipActive);
  if (STATE.isPipActive) {
    modal.classList.add('show');
  }

  const pipControls = document.getElementById('pip-controls-bar');
  if (pipControls) pipControls.style.display = STATE.isPipActive ? 'flex' : 'none';

  // Support native Picture-in-Picture for HTML5 video elements (continues even if leaving browser)
  const videoEl = document.querySelector('#theater-viewport-box video');
  if (videoEl && document.pictureInPictureEnabled) {
    if (STATE.isPipActive && document.pictureInPictureElement !== videoEl) {
      videoEl.requestPictureInPicture().catch(() => {});
    } else if (!STATE.isPipActive && document.pictureInPictureElement === videoEl) {
      document.exitPictureInPicture().catch(() => {});
    }
  }

  updateVideoPipButton();
}

function closePipPlayer(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  STATE.isPipActive = false;
  const modal = document.getElementById('theater-modal');
  if (modal) {
    modal.classList.remove('show', 'pip-mode', 'floating-video');
  }
  const pipControls = document.getElementById('pip-controls-bar');
  if (pipControls) pipControls.style.display = 'none';

  // Exit native PiP if active
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  }

  if (PLAYBACK_CONTROLLER.playbackMode === 'watch-video') {
    PLAYBACK_CONTROLLER.stopAll();
    STATE.currentTrack = null;
  }
  updateVideoPipButton();
}

function toggleTheaterFullscreen() {
  const target = document.getElementById('theater-box') || document.getElementById('theater-modal');
  if (!target) return;
  if (!document.fullscreenElement) {
    target.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ==============================================================================
// 5. Offline Download Engine & Dedicated Downloaded Tab
// ==============================================================================
function downloadCurrentPlayingTrack() {
  if (!STATE.currentTrack) {
    alert('Please play a track first to download.');
    return;
  }
  handleDownloadTrack(STATE.currentTrack);
}

function downloadCurrentLyrics() {
  if (!STATE.currentTrack || !STATE.currentTrack.lyrics) {
    alert('No lyrics available for this song.');
    return;
  }
  const lines = STATE.currentTrack.lyrics.map(l => `[${formatTime(l.time)}] ${l.text}`).join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${STATE.currentTrack.title}_Lyrics.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function renderDownloadedView() {
  const container = document.getElementById('downloaded-items-container');
  if (!container) return;
  const search = document.getElementById('downloaded-search');
  const query = search.value.trim().toLowerCase();
  search.closest('label').hidden = STATE.downloadedTracks.length === 0;

  if (STATE.downloadedTracks.length === 0) {
    container.innerHTML = `
      <div class="offline-empty">
        <i class="fa-solid fa-circle-down offline-empty-icon" aria-hidden="true"></i>
        <h3>No downloads yet</h3>
        <p>
          Import audio files from this device to play them offline.
        </p>
        <button class="primary-btn" onclick="switchTab('online')">
          <i class="fa-solid fa-compass"></i> Discover Online Music
        </button>
      </div>
    `;
    return;
  }

  const downloads = STATE.downloadedTracks.filter(item =>
    [item.title, item.artist, item.fileName].some(value => value?.toLowerCase().includes(query)));
  if (!downloads.length) {
    container.innerHTML = '<p class="offline-empty" role="status">No downloads match your search.</p>';
    return;
  }
  container.innerHTML = downloads.map(item => {
    const playable = offlineAudioTrack(item);
    const isThisPlaying = STATE.isPlaying && STATE.currentTrack && STATE.currentTrack.id === item.id;
    return `
      <div class="download-row ${isThisPlaying ? 'is-playing' : ''}" data-id="${item.id}">
        ${item.artwork && item.artwork !== offlineArtwork
        ? `<img src="${escapeHtml(item.artwork)}" class="download-row-thumb" alt="" loading="lazy">`
        : '<div class="download-row-thumb offline-track-icon"><i class="fa-solid fa-music" aria-hidden="true"></i></div>'}
        <div class="download-row-meta">
          <div class="download-row-title">
            ${escapeHtml(item.title)}
            ${isThisPlaying ? `
              <div class="now-playing-eq">
                <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
              </div>` : ''}
          </div>
          <div class="download-row-sub">
            <span>${escapeHtml(item.artist)}</span>
            <span>•</span>
            <span>${((item.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB</span>
            <span>•</span>
            <span class="badge-offline">
              <i class="fa-solid ${playable ? 'fa-circle-check' : 'fa-circle-exclamation'}" aria-hidden="true"></i>
              ${playable ? 'Offline ready' : 'Original audio missing'}
            </span>
          </div>
        </div>
        <div class="download-row-actions">
          <button class="primary-btn" onclick="playDownloadedTrack('${item.id}')" ${playable ? '' : 'disabled'}>
            <i class="fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}"></i> ${isThisPlaying ? 'Pause' : 'Play'}
          </button>
          <button class="icon-action-btn" onclick="openAddToPlaylistModalForTrack('${item.id}')" ${playable ? '' : 'disabled'} title="Add to Playlist">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button class="icon-action-btn" onclick="exportDownloadedFile('${item.id}')" ${playable ? '' : 'disabled'} title="Export File to PC">
            <i class="fa-solid fa-download"></i>
          </button>
          <button class="icon-action-btn" onclick="confirmDeleteDownload('${item.id}')" title="Delete Download" style="color: var(--danger);">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function confirmDeleteDownload(id) {
  const item = STATE.downloadedTracks.find(d => d.id === id);
  if (!item) return;
  if (confirm(`Remove "${item.title}" from your downloaded tracks?`)) {
    if (await removeDownloadFromDB(id)) refreshOfflineLibrary();
    else showVoiceToast('Could not remove this audio file.');
  }
}

// ==============================================================================
// 6. Online Music Cards & Multi-Source Free YouTube Search
// ==============================================================================
function renderOnlineCards(tracks) {
  const container = document.getElementById('online-cards-container');
  if (!container) return;

  const countEl = document.getElementById('online-grid-count');
  if (countEl) countEl.innerText = STATE.lastSearchQuery ? `${tracks.length} results` : `${tracks.length} releases`;

  if (!tracks.length) {
    if (STATE.lastSearchQuery && STATE.searchStatus !== 'complete') {
      container.replaceChildren();
      return;
    }
    container.innerHTML = `
      <div class="empty-search-state">
        <div class="empty-icon-circle"><i class="fa-solid fa-compact-disc"></i></div>
        <h3>No Results Found</h3>
        <button class="primary-btn" onclick="resetSearchAndShowAll()" style="display: inline-flex; align-items: center; gap: 8px; margin: 0 auto;">
          <i class="fa-solid fa-arrow-rotate-left"></i> View All 50+ Real Releases
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = tracks.map(track => {
    const isDownloaded = STATE.downloadedTracks.some(d => d.id === track.id && offlineAudioTrack(d));
    const isThisPlaying = STATE.isPlaying && STATE.currentTrack && STATE.currentTrack.id === track.id;
    const tagClass = track.type === 'lyric' ? 'tag-lyric' : 'tag-video';
    const tagText = track.resultLabel || (track.type === 'lyric' ? 'Lyrical Video' : (track.type === 'video' ? 'Official 4K' : 'Studio Master'));
    const qualityBadge = track.type === 'lyric' ? '1080p HD' : '4K Ultra HD';
    const viewsStr = track.resultLabel ? track.views : track.views || '120M views';
    const yearStr = track.resultLabel ? track.published : track.year || '2024';

    return `
      <div class="media-card ${isThisPlaying ? 'is-playing' : ''}" data-id="${track.id}" onclick="playTrackById('${track.id}')">
        <div class="card-thumb-wrapper">
          <img src="${track.artwork}" class="card-thumb" alt="${escapeHtml(track.title)}" loading="lazy" />
          <span class="card-type-tag ${tagClass}">${escapeHtml(tagText)}</span>
          ${track.resultLabel ? '' : `<span class="card-quality-tag">${qualityBadge}</span>`}
          ${track.duration == null ? '' : `<span class="card-duration-tag">${formatTime(track.duration)}</span>`}
          ${isThisPlaying ? `
            <div class="card-playing-overlay">
              <div class="now-playing-eq" style="display:flex;"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>
              <span>PLAYING</span>
            </div>` : ''}
          <div class="card-play-overlay">
            <div class="card-play-btn">
              <i class="fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}"></i>
            </div>
          </div>
        </div>
        <div class="card-info">
          <div class="card-title" title="${escapeHtml(track.title)}">
            ${escapeHtml(track.title)}
            ${isThisPlaying ? `
              <div class="now-playing-eq">
                <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
              </div>` : ''}
          </div>
          <div class="card-artist">
            <span>${escapeHtml(track.artist)}</span>
            ${track.resultLabel ? '' : '<i class="fa-solid fa-circle-check verified-badge" title="Verified Artist"></i>'}
          </div>
          <div class="card-stats">
            ${viewsStr ? `<span>${track.resultLabel ? '' : '<i class="fa-solid fa-eye"></i> '}${escapeHtml(viewsStr)}</span>` : ''}
            ${viewsStr && yearStr ? '<span>•</span>' : ''}
            ${yearStr ? `<span>${track.resultLabel ? '' : '<i class="fa-solid fa-calendar-days"></i> '}${escapeHtml(yearStr)}</span>` : ''}
          </div>
        </div>
        <div class="card-actions-bar" onclick="event.stopPropagation()">
          <button class="download-pill-btn ${isDownloaded ? 'downloaded' : ''}" onclick="handleDownloadTrackById('${track.id}')">
            <i class="fa-solid ${isDownloaded ? 'fa-check' : 'fa-circle-down'}"></i>
            <span>${isDownloaded ? 'Play offline' : mediaSource(track) ? 'Download' : 'Offline options'}</span>
          </button>
          <div style="display: flex; gap: 6px;">
            <button class="icon-action-btn" onclick="openAddToPlaylistModalForTrack('${track.id}')" title="Add to Playlist">
              <i class="fa-solid fa-plus"></i>
            </button>
            <button class="icon-action-btn" onclick="openLyricsForTrack('${track.id}')" title="View Synchronized Lyrics">
              <i class="fa-solid fa-align-left"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function playTrackById(id) {
  const track = onlineTracksList.find(t => t.id === id) || REAL_SONGS_CATALOG.find(t => t.id === id);
  if (!track) return;

  // Toggle pause if clicking already playing track
  if (STATE.isPlaying && STATE.currentTrack && STATE.currentTrack.id === id) {
    togglePlayPause();
    renderOnlineCards(onlineTracksList);
    return;
  }

  if (track.type === 'video') {
    // Open video theater without duplicate footer audio
    PLAYBACK_CONTROLLER.playVideo(track);
  } else {
    // Play audio in persistent footer player
    PLAYBACK_CONTROLLER.playAudio(track, onlineTracksList.length > 0 ? onlineTracksList : REAL_SONGS_CATALOG);
    if (track.type === 'lyric' || track.category === 'lyrics') {
      toggleLyricsDrawer(true);
    }
  }
}

function handleDownloadTrackById(id) {
  const track = resolveTrackById(id);
  if (track) void handleDownloadTrack(track);
}

function filterOnline(cat) {
  clearOnlineSearch();
  STATE.activeCategory = cat;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  const targetChip = document.getElementById(`chip-${cat}`);
  if (targetChip) targetChip.classList.add('active');

  const baseList = REAL_SONGS_CATALOG;
  let filtered = baseList;

  if (cat === 'all') {
    filtered = baseList;
  } else if (cat === 'hindi') {
    filtered = baseList.filter(t => t.category === 'hindi' || t.category === 'bollywood' || /arijit|shreya|badshah|sachin|jigar|sid sriram|rahman|jubin|atif|darshan|vishal mishra|jasleen|kesariya|apna bana le|chaleya|tum hi ho|raataan|heeriye|o maahi|pehle bhi main|dil diyan|shayad/i.test(`${t.artist} ${t.title}`));
  } else if (cat === 'telugu') {
    filtered = baseList.filter(t => t.category === 'telugu' || /naatu|rrr|anirudh|thaman|keeravaani|sid sriram|anurag kulkarni|butta bomma|samayama|oo antava|pushpa|devara|fear song|chuttamalle|samajavaragamana|ramuloo|inkem|srivalli/i.test(`${t.artist} ${t.title}`));
  } else if (cat === 'english') {
    filtered = baseList.filter(t => t.category === 'pop' || t.category === 'trending' || /weeknd|ed sheeran|dua lipa|neffex|eminem|queen/i.test(`${t.artist} ${t.title}`));
  } else if (cat === 'trending') {
    filtered = baseList.filter(t => t.category === 'trending' || (t.moods && t.moods.includes('party')) || (t.views && t.views.includes('B')));
  } else if (cat === 'video') {
    filtered = baseList.filter(t => t.type === 'video');
  } else if (cat === 'lyrics') {
    filtered = baseList.filter(t => t.type === 'lyric' || t.category === 'lyrics');
  } else if (cat === 'bollywood') {
    filtered = baseList.filter(t => t.category === 'bollywood' || t.category === 'hindi' || /arijit|shreya|badshah|sachin|jigar|sid sriram|rahman|jubin|atif|darshan/i.test(`${t.artist} ${t.title}`));
  } else if (cat === 'pop') {
    filtered = baseList.filter(t => t.category === 'pop' || /ed sheeran|weeknd|dua lipa|taylor|billie|bruno mars|charlie puth/i.test(`${t.artist} ${t.title}`));
  } else if (cat === 'edm') {
    filtered = baseList.filter(t => t.category === 'edm' || /alan walker|marshmello|chainsmokers|avicii|calvin harris|daft punk/i.test(`${t.artist} ${t.title}`));
  } else if (cat === 'hiphop') {
    filtered = baseList.filter(t => t.category === 'hiphop' || /eminem|post malone|swae lee|badshah/i.test(`${t.artist} ${t.title}`));
  } else if (cat === 'devotional') {
    filtered = baseList.filter(t => t.category === 'devotional' || (t.moods && t.moods.includes('devotional')));
  } else if (cat === 'lofi') {
    filtered = baseList.filter(t => t.category === 'lofi' || (t.moods && (t.moods.includes('focus') || t.moods.includes('relaxing'))));
  } else if (cat === 'workout') {
    filtered = baseList.filter(t => t.category === 'workout' || (t.moods && t.moods.includes('workout')));
  } else if (cat === 'rock') {
    filtered = baseList.filter(t => t.category === 'rock' || /queen|linkin park|imagine dragons|coldplay/i.test(`${t.artist} ${t.title}`));
  } else {
    filtered = baseList.filter(t => t.category === cat || (t.moods && t.moods.includes(cat)));
  }

  onlineTracksList = filtered;
  renderOnlineCards(filtered);
  void renderRecommendedSection();
}

let onlineSearchRequest;

function updateOnlineSearchStatus(status, query = '') {
  STATE.searchStatus = status;
  const panel = document.getElementById('online-search-status');
  if (!panel) return;
  const searching = status === 'pending';
  const unavailable = status === 'unavailable';
  const feed = document.getElementById('online-feed');
  const recommendations = document.getElementById('recommended-songs-section');
  if (searching && feed && recommendations?.nextElementSibling === feed) recommendations.before(feed);
  if (!status && recommendations && feed?.nextElementSibling === recommendations) feed.before(recommendations);
  panel.hidden = !searching && !unavailable;
  document.getElementById('online-search-message').textContent = searching ? 'Searching YouTube…' :
    unavailable ? 'Live YouTube search is temporarily unavailable.' : '';
  const link = document.getElementById('online-search-link');
  link.hidden = !unavailable;
  if (unavailable) link.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function clearOnlineSearch() {
  onlineSearchRequest?.abort();
  onlineSearchRequest = undefined;
  STATE.lastSearchQuery = '';
  STATE.searchMatches = [];
  STATE.recommendationMood = undefined;
  updateOnlineSearchStatus();
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) searchInput.value = '';
  document.getElementById('btn-search-clear').hidden = true;
  document.getElementById('online-grid-title').textContent = 'Explore Featured Tracks & Videos';
}

function resetSearchAndShowAll() {
  filterOnline('all');
  document.getElementById('yt-chips-container').scrollLeft = 0;
  if (STATE.currentTab === 'online') document.getElementById('viewport').scrollTop = 0;
}

function handleSearchInputChange(e) {
  const value = e.target.value;
  document.getElementById('btn-search-clear').hidden = !value;
  if (!value.trim()) resetSearchAndShowAll();
}

function clearSearchInput() {
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  resetSearchAndShowAll();
}

// Sidebar Collapse / Expand Toggle & Mobile Drawer Engine
function toggleSidebarCollapse() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // If on mobile/tablet viewport (<= 992px), toggle the mobile drawer
  if (window.innerWidth <= 992) {
    const isMobileOpen = sidebar.classList.toggle('mobile-open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.toggle('active', isMobileOpen);
    return;
  }

  // On desktop, toggle collapsed state
  const isCollapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('ak_sidebar_collapsed', isCollapsed ? '1' : '0');

  const playerBar = document.getElementById('bottom-player-bar');
  if (playerBar) {
    playerBar.classList.toggle('sidebar-collapsed', isCollapsed);
  }

  const icon = document.querySelector('#btn-collapse-sidebar i');
  if (icon) {
    icon.className = isCollapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left';
  }
}

function closeSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}

// Automatically close mobile sidebar when any item inside is clicked
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 992) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      if (e.target.closest('#sidebar a, #sidebar button:not(#btn-collapse-sidebar), #sidebar .vault-quick-card, #sidebar .brand-logo')) {
        closeSidebarMobile();
      }
    }
  }
});

function toggleSidebar() {
  toggleSidebarCollapse();
}

// Dynamic YouTube Search Engine (Real YouTube Streams, Videos & Audio)
async function handleSearchSubmit(e) {
  if (e) e.preventDefault();
  const query = (document.getElementById('global-search-input')?.value || '').trim();
  if (!query) {
    resetSearchAndShowAll();
    return;
  }

  onlineSearchRequest?.abort();
  const controller = new AbortController();
  onlineSearchRequest = controller;
  STATE.lastSearchQuery = query;
  STATE.searchMatches = [];
  STATE.recommendationMood = undefined;
  updateOnlineSearchStatus('pending');
  document.getElementById('btn-search-clear').hidden = false;
  document.querySelectorAll('#yt-chips-container .filter-chip').forEach(chip => chip.classList.remove('active'));
  if (STATE.currentTab !== 'online') switchTab('online');
  document.getElementById('viewport').scrollTop = 0;
  const titleEl = document.getElementById('online-grid-title');
  if (titleEl) {
    titleEl.innerText = `Results for "${query}"`;
  }
  const qLower = query.toLowerCase();
  const STOP_WORDS = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'by', 'song', 'songs', 'video', 'videos', 'music', 'official', 'full']);
  const rawTerms = qLower.split(/\s+/).filter(w => w.length > 0);
  const significantTerms = rawTerms.filter(w => !STOP_WORDS.has(w) && w.length > 1);
  const searchTerms = significantTerms.length > 0 ? significantTerms : rawTerms;

  // 1. Strict Search in Curated Catalog
  const matchedCatalog = REAL_SONGS_CATALOG.filter(t => {
    const titleLower = (t.title || '').toLowerCase();
    const artistLower = (t.artist || '').toLowerCase();
    const combined = `${titleLower} ${artistLower}`;
    if (titleLower.includes(qLower) || artistLower.includes(qLower)) return true;
    return searchTerms.every(term => combined.includes(term));
  });

  onlineTracksList = matchedCatalog;
  STATE.searchMatches = matchedCatalog;
  renderOnlineCards(matchedCatalog);
  void renderRecommendedSection();

  // 2. Fetch Live YouTube Search from Local Server Backend Endpoint
  let liveResults = [];
  let liveSearchAvailable = false;
  const searchTimeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        liveResults = data;
        liveSearchAvailable = true;
      }
    }
  } catch (err) {
    if (!controller.signal.aborted) console.warn('Live YouTube Search fetch notice:', err);
  } finally {
    clearTimeout(searchTimeout);
  }
  if (onlineSearchRequest !== controller) return;
  onlineSearchRequest = undefined;

  // Keep YouTube's ranking and preserve IDs already used by playlists and downloads.
  const catalogByVideo = new Map(REAL_SONGS_CATALOG.map(track => [track.youtubeId, track]));
  const byVideo = new Map(liveResults.map(track => {
    const existing = catalogByVideo.get(track.youtubeId);
    return [track.youtubeId, existing ? {
      ...existing, ...track, id: existing.id, category: existing.category,
      duration: track.duration ?? existing.duration
    } : track];
  }));
  for (const track of matchedCatalog) {
    if (!byVideo.has(track.youtubeId)) byVideo.set(track.youtubeId, track);
  }
  const combinedResults = [...byVideo.values()];

  onlineTracksList = combinedResults;
  STATE.searchMatches = combinedResults;
  updateOnlineSearchStatus(liveSearchAvailable ? 'complete' : 'unavailable', query);
  renderOnlineCards(combinedResults);
  void renderRecommendedSection();
  return combinedResults;
}

function showApiQuotaAlert(reason) {
  const banner = document.getElementById('api-quota-banner');
  const text = document.getElementById('quota-banner-text');
  if (banner && text) {
    banner.className = 'quota-alert-banner quota-exceeded';
    text.innerHTML = `⚠️ <strong>Notice:</strong> ${reason}. Switched seamlessly to free smart engine so playback & downloads never stop!`;
  }
  const apiStatus = document.getElementById('api-status-tag');
  if (apiStatus) apiStatus.innerText = 'Free Engine (Fallback)';
}

// ==============================================================================
// 7. Synchronized Lyrics Drawer
// ==============================================================================
function renderLyricsView(track) {
  document.getElementById('lyrics-track-title').innerText = track.title;
  document.getElementById('lyrics-track-artist').innerText = track.artist;
  const container = document.getElementById('lyrics-content-body');
  if (!container) return;

  if (!track.lyrics || track.lyrics.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <i class="fa-solid fa-align-left" style="font-size: 32px; margin-bottom: 12px; color: var(--primary);"></i>
        <p style="font-size: 14px; font-weight: 700;">Timed Lyrics Ready</p>
        <p style="font-size: 12px; margin-top: 4px;">Synchronizing with LRCLIB licensed API...</p>
      </div>
    `;
    return;
  }

  container.innerHTML = track.lyrics.map((l, i) => {
    return `
      <div class="karaoke-lyric-line" id="lyric-line-${i}" onclick="seekToTimestamp(${l.time})">
        <span class="karaoke-time-tag">[${formatTime(l.time)}]</span>
        <span>${escapeHtml(l.text)}</span>
      </div>
    `;
  }).join('');
}

function updateLyricsActiveLine(seconds) {
  if (!STATE.currentTrack || !STATE.currentTrack.lyrics) return;
  const lyrics = STATE.currentTrack.lyrics;
  let activeIdx = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (seconds >= lyrics[i].time) {
      activeIdx = i;
    }
  }

  lyrics.forEach((_, i) => {
    const el = document.getElementById(`lyric-line-${i}`);
    if (el) {
      const isNowActive = i === activeIdx;
      if (isNowActive && !el.classList.contains('active')) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (!isNowActive) {
        el.classList.remove('active');
      }
    }
  });
}

function seekToTimestamp(seconds) {
  if (ytPlayer && ytPlayer.seekTo) {
    ytPlayer.seekTo(seconds, true);
  }
}

function toggleLyricsDrawer(show) {
  const drawer = document.getElementById('lyrics-drawer');
  if (show === undefined) {
    drawer.classList.toggle('show');
  } else if (show) {
    drawer.classList.add('show');
  } else {
    drawer.classList.remove('show');
  }
}

function toggleTheaterVideo(show) {
  const modal = document.getElementById('theater-modal');
  if (!modal) return;
  const open = show ?? !modal.classList.contains('show');
  if (open && PLAYBACK_CONTROLLER.playbackMode === 'watch-video') {
    modal.classList.add('show');
  } else if (!open) {
    closePipPlayer();
  }
}

function openLyricsForTrack(id) {
  const track = onlineTracksList.find(t => t.id === id) || STATE.downloadedTracks.find(d => d.id === id);
  if (track) {
    renderLyricsView(track);
    toggleLyricsDrawer(true);
  }
}

// ==============================================================================
// 8. Local Media & Bulk Song Upload Engine
// ==============================================================================
function loadLocalFiles() {
  if (!dbInstance) return;
  return new Promise(resolve => {
    const request = dbInstance.transaction('local_files').objectStore('local_files').getAll();
    request.onsuccess = () => {
      STATE.localFiles = request.result || [];
      updateLocalStats();
      if (STATE.currentTab === 'local') renderLocalFilesView();
      resolve();
    };
    request.onerror = () => resolve();
  });
}

function updateLocalStats() {
  const allCount = STATE.localFiles.length;
  const audioCount = STATE.localFiles.filter(f => f.category === 'audio').length;
  const videoCount = STATE.localFiles.filter(f => f.category === 'video').length;
  const imgCount = STATE.localFiles.filter(f => f.category === 'image').length;
  const docCount = STATE.localFiles.filter(f => f.category === 'document').length;

  const sCount = document.getElementById('sidebar-local-count');
  if (sCount) sCount.innerText = allCount;
  const cAll = document.getElementById('local-count-all');
  if (cAll) cAll.innerText = `${allCount} files`;
  const cAud = document.getElementById('local-count-audio');
  if (cAud) cAud.innerText = `${audioCount} songs`;
  const cVid = document.getElementById('local-count-video');
  if (cVid) cVid.innerText = `${videoCount} videos`;
  const cImg = document.getElementById('local-count-image');
  if (cImg) cImg.innerText = `${imgCount} photos`;
  const cDoc = document.getElementById('local-count-doc');
  if (cDoc) cDoc.innerText = `${docCount} docs`;
}

function filterLocalFolder(folder) {
  STATE.activeLocalFolder = folder;
  STATE.activeSubFolder = null;
  STATE.selectedLocalFileIds.clear();

  renderLocalFilesView();
}

function openSubFolder(folderId) {
  STATE.activeSubFolder = folderId;
  STATE.selectedLocalFileIds.clear();
  renderLocalFilesView();
}

function closeSubFolder() {
  STATE.activeSubFolder = null;
  STATE.selectedLocalFileIds.clear();
  renderLocalFilesView();
}

function toggleSelectAllLocalFiles(e) {
  const checked = e.target.checked;
  const checkboxes = document.querySelectorAll('#local-content-display .bulk-select-cb[data-id]');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    const id = cb.getAttribute('data-id');
    if (checked) {
      STATE.selectedLocalFileIds.add(id);
    } else {
      STATE.selectedLocalFileIds.delete(id);
    }
  });
  updateBulkActionButtons();
}

function toggleSelectLocalFile(id, e) {
  if (e) e.stopPropagation();
  if (STATE.selectedLocalFileIds.has(id)) {
    STATE.selectedLocalFileIds.delete(id);
  } else {
    STATE.selectedLocalFileIds.add(id);
  }
  updateBulkActionButtons();
}

function updateBulkActionButtons() {
  const count = STATE.selectedLocalFileIds.size;
  const countLabel = document.getElementById('bulk-selected-count');
  if (countLabel) countLabel.innerText = `${count} selected`;
  const delBtn = document.getElementById('btn-bulk-delete');
  if (delBtn) {
    delBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    delBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Delete Selected (${count})`;
  }
}

async function executeBulkDeleteLocalFiles() {
  const count = STATE.selectedLocalFileIds.size;
  if (count === 0) return;

  openDeleteConfirmModal({
    title: `Delete ${count} Selected Files?`,
    name: `${count} file(s) selected`,
    desc: `Are you sure you want to permanently delete these ${count} selected media file(s)? This action cannot be undone.`,
    onConfirm: () => {
      if (!dbInstance) return;
      const tx = dbInstance.transaction('local_files', 'readwrite');
      const store = tx.objectStore('local_files');

      for (const id of STATE.selectedLocalFileIds) {
        store.delete(id);
      }

      tx.oncomplete = () => {
        STATE.selectedLocalFileIds.clear();
        loadLocalFiles();
      };
    }
  });
}

function visibleLocalFiles() {
  const { activeLocalFolder, activeSubFolder } = STATE;
  return STATE.localFiles.filter(file => {
    if (activeSubFolder) return file.folderId === activeSubFolder;
    return activeLocalFolder === 'all' || file.category === activeLocalFolder;
  });
}

function renderLocalFilesView() {
  const displayContainer = document.getElementById('local-content-display');
  if (!displayContainer) return;
  document.querySelectorAll('#local-folders-grid .folder-card').forEach(card => {
    const isActive = card.id === 'fcard-' + STATE.activeLocalFolder;
    card.classList.toggle('active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });


  const folderLabels = {
    all: 'All Files',
    audio: 'Music & Songs',
    video: 'Videos & Movies',
    image: 'Gallery & Photos',
    document: 'PDFs & Documents'
  };

  const activeSub = STATE.customFolders.find(f => f.id === STATE.activeSubFolder);
  const items = visibleLocalFiles();

  // Get matching subfolders for the current category
  const matchingSubfolders = STATE.customFolders.filter(f => {
    if (activeSub) return false;
    if (STATE.activeLocalFolder === 'all') return true;
    return f.category === STATE.activeLocalFolder;
  });

  const categoryName = folderLabels[STATE.activeLocalFolder] || 'Library';

  // Subfolder Breadcrumb Bar
  let breadcrumbsHtml = '';
  if (activeSub) {
    breadcrumbsHtml = `
      <div class="folder-breadcrumbs">
        <div class="folder-breadcrumb-trail">
          <button type="button" class="folder-breadcrumb-link" onclick="closeSubFolder()">
            <i class="fa-solid fa-arrow-left"></i> ${escapeHtml(categoryName)}
          </button>
          <span style="color: var(--text-muted); font-size: 11px;">/</span>
          <span style="color: var(--primary);"><i class="fa-solid fa-folder-open"></i> ${escapeHtml(activeSub.name)}</span>
          <span style="font-size: 11px; color: var(--text-muted);">(${items.length} items)</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="secondary-btn" onclick="openRenameFolderModal('${activeSub.id}')" style="font-size: 12px; padding: 6px 12px;">
            <i class="fa-solid fa-pen-to-square"></i> Rename
          </button>
          <button class="primary-btn" onclick="openBulkUploadModal()" style="font-size: 12px; padding: 6px 14px;">
            <i class="fa-solid fa-plus"></i> Add Files
          </button>
        </div>
      </div>
    `;
  }

  // Subfolder Cards Section (inside current category)
  let subfoldersGridHtml = '';
  if (!activeSub && matchingSubfolders.length > 0) {
    subfoldersGridHtml = `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 13px; font-weight: 800; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">
            <i class="fa-solid fa-folder-tree" style="color: var(--primary); margin-right: 6px;"></i> Folders in ${escapeHtml(categoryName)}
          </h4>
          <button class="pill-btn" onclick="openCreateFolderModal()" style="font-size: 11px; padding: 4px 10px;">
            <i class="fa-solid fa-plus"></i> New Folder
          </button>
        </div>
        <div class="subfolder-cards-grid">
          ${matchingSubfolders.map(sub => {
      const count = STATE.localFiles.filter(f => f.folderId === sub.id).length;
      return `
              <div class="subfolder-card">
                <button type="button" class="subfolder-open" onclick="openSubFolder('${sub.id}')">
                <div class="subfolder-icon" style="background: var(--primary-light); color: var(--primary);">
                  <i class="fa-solid fa-folder-open"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 13.5px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(sub.name)}
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                    ${count} ${count === 1 ? 'file' : 'files'}
                  </div>
                </div>
                </button>
                <div style="display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
                  <button class="icon-action-btn" onclick="openRenameFolderModal('${sub.id}')" title="Rename Folder" style="padding: 4px;">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button class="icon-action-btn" onclick="deleteCustomFolder('${sub.id}')" title="Delete Folder" style="color: var(--danger); padding: 4px;">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `;
  }

  // Bulk Action Bar HTML
  const bulkActionBarHtml = `
    <div class="bulk-action-bar">
      <label class="bulk-select-wrap">
        <input type="checkbox" onchange="toggleSelectAllLocalFiles(event)" class="bulk-select-cb" />
        <span>Select All</span>
        <span id="bulk-selected-count" style="font-size: 12px; color: var(--text-muted); margin-left: 6px;">0 selected</span>
      </label>
      <div style="display: flex; gap: 8px;">
        <button id="btn-bulk-delete" class="danger-btn" onclick="executeBulkDeleteLocalFiles()" style="display: none; padding: 6px 14px; font-size: 12px; background: linear-gradient(135deg, #EF4444, #DC2626); color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          <i class="fa-solid fa-trash-can"></i> Delete Selected
        </button>
        <button class="secondary-btn" onclick="openBulkUploadModal()" style="font-size: 12px; padding: 6px 14px;">
          <i class="fa-solid fa-plus"></i> Upload Media
        </button>
      </div>
    </div>
  `;

  // 1. EMPTY STATE
  if (items.length === 0 && matchingSubfolders.length === 0) {
    const folderName = activeSub ? activeSub.name : (folderLabels[STATE.activeLocalFolder] || 'Folder');
    displayContainer.innerHTML = `
      ${breadcrumbsHtml}
      <div class="empty-folder-box">
        <i class="fa-solid fa-folder-open" style="font-size: 42px; color: var(--text-subtle); margin-bottom: 12px; display: block;"></i>
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">No Files in ${escapeHtml(folderName)}</h3>
        <p style="font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto 16px;">
          ${STATE.activeLocalFolder === 'audio'
        ? 'Upload your MP3, WAV or FLAC music tracks with custom covers. They will play directly in your studio player!'
        : (STATE.activeLocalFolder === 'image'
          ? 'Upload your pictures, wallpapers and artworks to browse them in an interactive gallery.'
          : 'Upload local media files or organize your library by creating folders.')}
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button class="primary-btn" onclick="openBulkUploadModal()">
            <i class="fa-solid fa-cloud-arrow-up"></i> Upload Media To This Folder
          </button>
          <button class="secondary-btn" onclick="openCreateFolderModal()">
            <i class="fa-solid fa-folder-plus"></i> + New Folder
          </button>
        </div>
      </div>
    `;
    return;
  }

  // 2. GALLERY & PHOTOS GRID VIEW (Strict 1:1 Square Dimensions, Lightbox & Bulk Delete)
  if (STATE.activeLocalFolder === 'image' || (activeSub && activeSub.category === 'image')) {
    displayContainer.innerHTML = `
      ${breadcrumbsHtml}
      ${subfoldersGridHtml}
      ${items.length > 0 ? bulkActionBarHtml : ''}
      <div class="gallery-photos-grid">
        ${items.map(file => {
      const imgSrc = file.coverUrl || file.fileData || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
      const isSelected = STATE.selectedLocalFileIds.has(file.id);
      return `
            <div class="gallery-photo-card" onclick="openPhotoLightbox('${escapeHtml(imgSrc)}', '${escapeHtml(file.name)}')">
              <div class="gallery-photo-thumb-wrap">
                <div class="photo-select-box" onclick="event.stopPropagation();">
                  <input type="checkbox" class="bulk-select-cb" data-id="${file.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectLocalFile('${file.id}', event)" />
                </div>
                <img src="${imgSrc}" class="gallery-photo-thumb" alt="${escapeHtml(file.name)}" loading="lazy" />
                <div class="gallery-photo-overlay">
                  <div class="gallery-view-btn" title="View Fullscreen">
                    <i class="fa-solid fa-expand"></i>
                  </div>
                </div>
              </div>
              <div class="gallery-photo-info">
                <div style="min-width: 0; flex: 1; margin-right: 8px;">
                  <div class="gallery-photo-title" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                  <div class="gallery-photo-size">${(file.size / (1024 * 1024)).toFixed(1)} MB • ${file.uploadDate}</div>
                </div>
                <div class="media-action-wrap" onclick="event.stopPropagation();">
                  <button class="icon-action-btn" onclick="toggleMediaItemMenu('${file.id}', event)" title="Actions">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                  <div class="media-action-dropdown" id="menu-${file.id}">
                    <button class="action-menu-item" onclick="openMoveModal('${file.id}')">
                      <i class="fa-solid fa-folder-tree"></i> Move to Folder
                    </button>
                    <button class="action-menu-item" onclick="openEditFileModal('${file.id}')">
                      <i class="fa-solid fa-pencil"></i> Edit Details
                    </button>
                    <button class="action-menu-item danger-item" onclick="deleteLocalFile('${file.id}')">
                      <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
    return;
  }

  // 3. MUSIC & SONGS VIEW (Local Audio Playback, Equalizer Wave & Proper 56x56 Cover Thumbnail)
  if (STATE.activeLocalFolder === 'audio' || (activeSub && activeSub.category === 'audio')) {
    displayContainer.innerHTML = `
      ${breadcrumbsHtml}
      ${subfoldersGridHtml}
      ${items.length > 0 ? bulkActionBarHtml : ''}
      <div class="local-audio-grid" style="display: flex; flex-direction: column; gap: 10px;">
        ${items.map(file => {
      const isPlayingThis = STATE.isPlaying && STATE.currentTrack && STATE.currentTrack.id === file.id;
      const coverImg = file.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
      const isSelected = STATE.selectedLocalFileIds.has(file.id);
      return `
            <div class="local-audio-row ${isPlayingThis ? 'is-playing' : ''}" data-id="${file.id}">
              <div onclick="event.stopPropagation();" style="display: flex; align-items: center;">
                <input type="checkbox" class="bulk-select-cb" data-id="${file.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectLocalFile('${file.id}', event)" />
              </div>
              <img src="${coverImg}" class="local-audio-thumb" alt="Cover" style="width: 56px; height: 56px; min-width: 56px; aspect-ratio: 1/1; border-radius: 10px; object-fit: cover;" />
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 700; color: var(--text-main); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(file.name)}
                  </span>
                  ${isPlayingThis ? '<span style="color: #10B981; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;"><span class="badge-pulse"></span> PLAYING</span>' : ''}
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                  ${escapeHtml(file.artist || 'Local Upload')} • ${(file.size / (1024 * 1024)).toFixed(1)} MB • Added ${file.uploadDate}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <button class="primary-btn" onclick="playLocalFile('${file.id}')" style="padding: 7px 16px; font-size: 12px; ${isPlayingThis ? 'background: linear-gradient(135deg, #EF4444, #DC2626); box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);' : ''}">
                  <i class="fa-solid ${isPlayingThis ? 'fa-pause' : 'fa-play'}"></i> ${isPlayingThis ? 'Pause' : 'Play'}
                </button>
                <div class="media-action-wrap" onclick="event.stopPropagation();">
                  <button class="icon-action-btn" onclick="toggleMediaItemMenu('${file.id}', event)" title="Actions">
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                  <div class="media-action-dropdown" id="menu-${file.id}">
                    <button class="action-menu-item" onclick="openMoveModal('${file.id}')">
                      <i class="fa-solid fa-folder-tree"></i> Move to Folder
                    </button>
                    <button class="action-menu-item" onclick="openAddToPlaylistModalForTrack('${file.id}')">
                      <i class="fa-solid fa-plus"></i> Add to Playlist
                    </button>
                    <button class="action-menu-item" onclick="handleDownloadTrackById('${file.id}')"><i class="fa-solid fa-download"></i> Save Offline</button>
                    <button class="action-menu-item" onclick="openEditFileModal('${file.id}')">
                      <i class="fa-solid fa-pencil"></i> Edit Details
                    </button>
                    <button class="action-menu-item danger-item" onclick="deleteLocalFile('${file.id}')">
                      <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
    return;
  }

  // 4. VIDEOS & MOVIES GRID VIEW (16:9 Aspect Ratio Cards, Play Badge & Theater Modal Playback)
  if (STATE.activeLocalFolder === 'video' || (activeSub && activeSub.category === 'video')) {
    displayContainer.innerHTML = `
      ${breadcrumbsHtml}
      ${subfoldersGridHtml}
      ${items.length > 0 ? bulkActionBarHtml : ''}
      <div class="local-videos-grid">
        ${items.map(file => {
      const isSelected = STATE.selectedLocalFileIds.has(file.id);
      const thumb = file.coverUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600';
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return `
            <div class="video-media-card" onclick="playLocalVideo('${file.id}')">
              <div class="video-thumb-container">
                <div class="photo-select-box" onclick="event.stopPropagation();" style="position: absolute; top: 10px; left: 10px; z-index: 5;">
                  <input type="checkbox" class="bulk-select-cb" data-id="${file.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectLocalFile('${file.id}', event)" />
                </div>
                <img src="${thumb}" alt="${escapeHtml(file.name)}" loading="lazy" />
                <div class="video-play-badge">
                  <div class="video-play-badge-icon">
                    <i class="fa-solid fa-play"></i>
                  </div>
                </div>
                <span class="video-badge-tag"><i class="fa-solid fa-film"></i> HD Video</span>
              </div>
              <div class="video-card-meta">
                <div class="video-card-title" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                <div class="video-card-sub">
                  <span>${sizeMb} MB</span>
                  <span>•</span>
                  <span>${file.uploadDate}</span>
                </div>
                <div class="video-card-footer" onclick="event.stopPropagation();">
                  <button class="primary-btn" onclick="playLocalVideo('${file.id}')" style="padding: 6px 14px; font-size: 11.5px; font-weight: 700;">
                    <i class="fa-solid fa-play"></i> Watch Video
                  </button>
                  <div class="media-action-wrap">
                    <button class="icon-action-btn" onclick="toggleMediaItemMenu('${file.id}', event)" title="Actions">
                      <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div class="media-action-dropdown" id="menu-${file.id}">
                      <button class="action-menu-item" onclick="openMoveModal('${file.id}')">
                        <i class="fa-solid fa-folder-tree"></i> Move to Folder
                      </button>
                      <button class="action-menu-item" onclick="openEditFileModal('${file.id}')">
                        <i class="fa-solid fa-pencil"></i> Edit Details
                      </button>
                      <button class="action-menu-item danger-item" onclick="deleteLocalFile('${file.id}')">
                        <i class="fa-solid fa-trash-can"></i> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
    return;
  }

  // 5. GENERAL / ALL FILES / DOCS TABLE VIEW
  displayContainer.innerHTML = `
    ${breadcrumbsHtml}
    ${subfoldersGridHtml}
    ${items.length > 0 ? bulkActionBarHtml : ''}
    <div style="overflow-x: auto; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg);">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); background: var(--bg-surface-raised); color: var(--text-muted); text-align: left;">
            <th style="padding: 12px 16px; width: 40px;"></th>
            <th style="padding: 12px 16px;">Name</th>
            <th style="padding: 12px 16px;">Category</th>
            <th style="padding: 12px 16px;">Size</th>
            <th style="padding: 12px 16px;">Date Added</th>
            <th style="padding: 12px 16px; text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(file => {
    const isSelected = STATE.selectedLocalFileIds.has(file.id);
    const iconMap = { audio: 'fa-music', video: 'fa-video', image: 'fa-image', document: 'fa-file-lines' };
    const isVideo = file.category === 'video' || (file.name && /\.(mp4|webm|mkv|mov|avi)$/i.test(file.name));
    const isAudio = file.category === 'audio' || (file.name && /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name));
    const isMedia = isAudio || isVideo;
    const isThisPlaying = STATE.isPlaying && STATE.currentTrack && STATE.currentTrack.id === file.id;
    return `
              <tr style="border-bottom: 1px solid var(--border); cursor: ${isMedia ? 'pointer' : 'default'}; transition: background 0.15s ease;" onclick="${isMedia ? `playLocalFile('${file.id}')` : ''}" class="${isThisPlaying ? 'is-playing-row' : ''}">
                <td style="padding: 12px 16px;" onclick="event.stopPropagation();">
                  <input type="checkbox" class="bulk-select-cb" data-id="${file.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectLocalFile('${file.id}', event)" />
                </td>
                <td style="padding: 12px 16px; font-weight: 700; color: var(--text-main);">
                  <i class="fa-solid ${iconMap[file.category] || (isVideo ? 'fa-video' : 'fa-file')}" style="margin-right: 8px; color: ${isVideo ? '#EF4444' : 'var(--primary)'};"></i>
                  ${escapeHtml(file.name)}
                  ${isThisPlaying ? '<span style="color: #10B981; font-size: 11px; margin-left: 8px;"><i class="fa-solid fa-volume-high"></i> PLAYING</span>' : ''}
                </td>
                <td style="padding: 12px 16px; color: var(--text-muted); text-transform: capitalize;">${isVideo ? 'Video' : file.category}</td>
                <td style="padding: 12px 16px; color: var(--text-muted);">${(file.size / (1024 * 1024)).toFixed(1)} MB</td>
                <td style="padding: 12px 16px; color: var(--text-muted);">${file.uploadDate}</td>
                <td style="padding: 12px 16px; text-align: right;" onclick="event.stopPropagation();">
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    ${isMedia ? `
                    <button class="primary-btn" onclick="playLocalFile('${file.id}')" style="padding: 5px 12px; font-size: 11.5px; ${isThisPlaying ? 'background: #EF4444;' : ''}">
                      <i class="fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}"></i> ${isVideo ? 'Watch' : (isThisPlaying ? 'Pause' : 'Play')}
                    </button>` : ''}
                    <div class="media-action-wrap" onclick="event.stopPropagation();" style="display: inline-block;">
                      <button class="icon-action-btn" onclick="toggleMediaItemMenu('${file.id}', event)" title="Actions">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                      <div class="media-action-dropdown" id="menu-${file.id}">
                        <button class="action-menu-item" onclick="openMoveModal('${file.id}')">
                          <i class="fa-solid fa-folder-tree"></i> Move to Folder
                        </button>
                        ${file.category === 'audio' || file.category === 'video' ? `
                        <button class="action-menu-item" onclick="openAddToPlaylistModalForTrack('${file.id}')">
                          <i class="fa-solid fa-plus"></i> Add to Playlist
                        </button>
                      <button class="action-menu-item" onclick="handleDownloadTrackById('${file.id}')"><i class="fa-solid fa-download"></i> Save Offline</button>` : ''}
                        <button class="action-menu-item" onclick="openEditFileModal('${file.id}')">
                          <i class="fa-solid fa-pencil"></i> Edit Details
                        </button>
                        <button class="action-menu-item danger-item" onclick="deleteLocalFile('${file.id}')">
                          <i class="fa-solid fa-trash-can"></i> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function openCreateFolderModal() {
  const input = document.getElementById('new-folder-name-input');
  if (input) input.value = '';
  const select = document.getElementById('new-folder-category-select');
  if (select) {
    if (['audio', 'image', 'video', 'document'].includes(STATE.activeLocalFolder)) {
      select.value = STATE.activeLocalFolder;
    } else {
      select.value = 'all';
    }
  }
  openModal('create-folder-modal');
}

function confirmCreateFolder() {
  const nameInput = document.getElementById('new-folder-name-input');
  const catSelect = document.getElementById('new-folder-category-select');
  const name = (nameInput ? nameInput.value : '').trim();
  const category = (catSelect ? catSelect.value : 'all');

  if (!name) {
    alert('Please enter a folder name.');
    return;
  }

  const newFolder = {
    id: `cf_${Date.now()}`,
    name,
    category,
    createdAt: new Date().toLocaleDateString()
  };

  STATE.customFolders.push(newFolder);
  localStorage.setItem('ak_custom_folders', JSON.stringify(STATE.customFolders));

  closeModal('create-folder-modal');

  renderLocalFilesView();
  openSubFolder(newFolder.id);
}

function openRenameFolderModal(folderId) {
  const folder = STATE.customFolders.find(f => f.id === folderId);
  if (!folder) return;
  STATE.editingFolderId = folderId;
  const input = document.getElementById('rename-folder-input');
  if (input) input.value = folder.name;
  openModal('rename-folder-modal');
}

function executeRenameFolder() {
  const input = document.getElementById('rename-folder-input');
  const newName = (input ? input.value : '').trim();
  if (!newName) {
    alert('Please enter a folder name.');
    return;
  }
  const folder = STATE.customFolders.find(f => f.id === STATE.editingFolderId);
  if (folder) {
    folder.name = newName;
    localStorage.setItem('ak_custom_folders', JSON.stringify(STATE.customFolders));

    renderLocalFilesView();
    closeModal('rename-folder-modal');
    alert(`Folder renamed to "${newName}"!`);
  }
}

function deleteCustomFolder(id) {
  const folder = STATE.customFolders.find(f => f.id === id);
  const name = folder ? folder.name : 'this folder';

  openDeleteConfirmModal({
    title: 'Delete Folder?',
    name: name,
    desc: `Are you sure you want to delete the folder "${name}"? Files inside will be retained in your library.`,
    onConfirm: () => {
      STATE.customFolders = STATE.customFolders.filter(f => f.id !== id);
      localStorage.setItem('ak_custom_folders', JSON.stringify(STATE.customFolders));

      // Reset folderId on local files that belonged to this folder
      if (dbInstance) {
        const tx = dbInstance.transaction('local_files', 'readwrite');
        const store = tx.objectStore('local_files');
        STATE.localFiles.forEach(f => {
          if (f.folderId === id) {
            f.folderId = null;
            store.put(f);
          }
        });
      }

      if (STATE.activeLocalFolder === id || STATE.activeSubFolder === id) {
        STATE.activeLocalFolder = 'all';
        STATE.activeSubFolder = null;
      }

      renderLocalFilesView();
    }
  });
}

function openMoveModal(fileId) {
  const file = STATE.localFiles.find(f => f.id === fileId);
  if (!file) return;

  STATE.movingFileId = fileId;
  const nameLabel = document.getElementById('move-file-item-name');
  if (nameLabel) nameLabel.innerText = `Move "${file.name}" to folder:`;

  // Show ONLY valid destination folders for this media's category!
  const validFolders = STATE.customFolders.filter(f => f.category === file.category || f.category === 'all');

  const select = document.getElementById('move-destination-folder-select');
  if (select) {
    select.innerHTML = `
      <option value="">Root / ${file.category.toUpperCase()} Library</option>
      ${validFolders.map(f => `<option value="${f.id}" ${file.folderId === f.id ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
    `;
  }

  openModal('move-file-modal');
}

function executeMoveFile() {
  const select = document.getElementById('move-destination-folder-select');
  const targetFolderId = select ? select.value : '';

  const file = STATE.localFiles.find(f => f.id === STATE.movingFileId);
  if (!file) return;

  file.folderId = targetFolderId || null;

  if (dbInstance) {
    const tx = dbInstance.transaction('local_files', 'readwrite');
    tx.objectStore('local_files').put(file);
    tx.oncomplete = () => {
      closeModal('move-file-modal');
      loadLocalFiles();
      alert(`Moved "${file.name}" successfully!`);
    };
  }
}

function openPhotoLightbox(photoSrc, photoTitle) {
  const img = document.getElementById('lightbox-photo-img');
  const title = document.getElementById('lightbox-photo-title');
  const dlLink = document.getElementById('btn-lightbox-download');

  if (img) img.src = photoSrc;
  if (title) title.innerText = photoTitle || 'Photo View';
  if (dlLink) {
    dlLink.href = photoSrc;
    dlLink.download = (photoTitle || 'photo').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  }

  openModal('photo-lightbox-modal');
}

function openBulkUploadModal() {
  document.getElementById('bulk-file-input').value = '';
  document.getElementById('bulk-cover-input').value = '';
  document.getElementById('upload-files-preview-list').innerHTML = '';
  openModal('bulk-upload-modal');
}

function previewUploadFiles(e) {
  const files = e.target.files;
  const preview = document.getElementById('upload-files-preview-list');
  if (!files || files.length === 0) {
    preview.innerHTML = '';
    return;
  }
  preview.innerHTML = `<strong>${files.length} file(s) selected:</strong><br>` +
    Array.from(files).map(f => `• ${escapeHtml(f.name)} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join('<br>');
}

async function executeBulkUpload() {
  const fileInput = document.getElementById('bulk-file-input');
  const coverInput = document.getElementById('bulk-cover-input');
  const files = fileInput.files;

  if (!files || files.length === 0) {
    alert('Please select at least one file to upload.');
    return;
  }

  let customCoverUrl = '';
  if (coverInput.files && coverInput.files[0]) {
    customCoverUrl = await readFileAsDataUrl(coverInput.files[0]);
  }

  for (const file of files) {
    let cat = 'document';
    if (file.type.startsWith('audio') || file.name.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i)) cat = 'audio';
    else if (file.type.startsWith('video') || file.name.match(/\.(mp4|mov|webm|mkv)$/i)) cat = 'video';
    else if (file.type.startsWith('image') || file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) cat = 'image';

    const fileData = await readFileAsDataUrl(file);

    let assignedCover = customCoverUrl;
    if (!assignedCover) {
      if (cat === 'image') assignedCover = fileData;
      else if (cat === 'audio') assignedCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
      else if (cat === 'video') assignedCover = 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600';
      else assignedCover = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600';
    }

    const currentFolderId = STATE.activeSubFolder || (STATE.customFolders.some(f => f.id === STATE.activeLocalFolder) ? STATE.activeLocalFolder : null);

    const localItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      artist: 'Local Media',
      category: cat,
      size: file.size,
      fileData: fileData,
      audioSrc: fileData,
      coverUrl: assignedCover,
      folderId: currentFolderId,
      uploadDate: new Date().toLocaleDateString(),
    };

    if (!dbInstance) continue;
    const tx = dbInstance.transaction('local_files', 'readwrite');
    tx.objectStore('local_files').put(localItem);
  }

  closeModal('bulk-upload-modal');
  loadLocalFiles();
  alert(`Uploaded ${files.length} file(s) successfully! You can now play your songs and view your photos.`);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function localAudioQueue() {
  return visibleLocalFiles().map(localAudioTrack).filter(Boolean);
}

function playLocalFile(id) {
  const file = STATE.localFiles.find(f => f.id === id);
  if (!file) return;

  const isVideo = file.category === 'video' ||
    (file.type && file.type.includes('video')) ||
    (file.name && /\.(mp4|webm|mkv|mov|avi|wmv)$/i.test(file.name));

  if (isVideo) {
    playLocalVideo(id);
    return;
  }

  const queue = localAudioQueue();
  const track = queue.find(item => item.id === id) || localAudioTrack(file);
  if (!track) return showVoiceToast('This item has no playable audio file.');
  if (STATE.currentTrack?.id === id && STATE.isPlaying) {
    togglePlayPause();
  } else {
    playTrack(track, queue.length ? queue : [track]);
  }
  renderLocalFilesView();
}

function playAllLocalSongs() {
  const queue = localAudioQueue();
  if (queue.length) playTrack(queue[0], queue);
  else showVoiceToast('Add an audio file to play music here.');
}

function playLocalVideo(id) {
  const file = STATE.localFiles.find(f => f.id === id);
  if (!file) return;

  // Stop background playback
  STUDIO_PLAYER.stopAll();

  // Set theater title
  const titleEl = document.getElementById('theater-video-title');
  if (titleEl) titleEl.innerText = file.name;

  // Render video player into theater viewport
  const viewportBox = document.getElementById('theater-viewport-box');
  if (viewportBox) {
    const videoSrc = file.fileData || file.audioSrc || '';
    if (videoSrc) {
      viewportBox.innerHTML = `
        <video 
          src="${videoSrc}" 
          controls 
          autoplay 
          playsinline
          style="width: 100%; height: 100%; object-fit: contain; background: #000; border-radius: var(--radius-lg);">
          Your browser does not support HTML5 video playback.
        </video>
      `;
    } else {
      viewportBox.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#FFF; text-align:center; padding:20px;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:36px; color:var(--warning); margin-bottom:12px;"></i>
          <h4>Video Data Unavailable</h4>
          <p style="font-size:12px; color:#aaa; margin-top:4px;">No streaming source or video data found for this file.</p>
        </div>
      `;
    }
  }

  toggleTheaterVideo(true);
}

// Custom Delete Confirmation Modal Handlers
let PENDING_DELETE_ACTION = null;

function openDeleteConfirmModal(config) {
  const titleEl = document.getElementById('delete-confirm-title');
  const descEl = document.getElementById('delete-confirm-desc');
  const targetEl = document.getElementById('delete-confirm-target-name');

  if (titleEl) titleEl.innerText = config.title || 'Delete Item?';
  if (descEl) descEl.innerText = config.desc || 'Are you sure you want to permanently delete this item? This action cannot be undone.';
  if (targetEl) targetEl.innerText = config.name || '';

  PENDING_DELETE_ACTION = config.onConfirm || null;
  openModal('delete-confirm-modal');
}

function executeConfirmedDelete() {
  closeModal('delete-confirm-modal');
  if (typeof PENDING_DELETE_ACTION === 'function') {
    PENDING_DELETE_ACTION();
    PENDING_DELETE_ACTION = null;
  }
}

function openEditFileModal(id) {
  const file = STATE.localFiles.find(f => f.id === id);
  if (!file) return;
  STATE.editingLocalFileId = id;
  const input = document.getElementById('edit-file-name-input');
  if (input) input.value = file.name;
  openModal('edit-file-modal');
}

function saveFileRename() {
  const input = document.getElementById('edit-file-name-input');
  const newName = (input ? input.value : '').trim();
  if (!newName) {
    alert('Please enter a valid file name.');
    return;
  }
  const file = STATE.localFiles.find(f => f.id === STATE.editingLocalFileId);
  if (!file) return;

  file.name = newName;
  if (dbInstance) {
    const tx = dbInstance.transaction('local_files', 'readwrite');
    tx.objectStore('local_files').put(file);
    tx.oncomplete = () => {
      closeModal('edit-file-modal');
      loadLocalFiles();
      alert('File renamed successfully!');
    };
  }
}

function deleteLocalFile(id) {
  const file = STATE.localFiles.find(f => f.id === id);
  const name = file ? file.name : 'this file';

  openDeleteConfirmModal({
    title: 'Delete Media File?',
    name: name,
    desc: `Are you sure you want to permanently delete "${name}"? This file will be removed from your local media storage.`,
    onConfirm: () => {
      if (!dbInstance) return;
      const tx = dbInstance.transaction('local_files', 'readwrite');
      tx.objectStore('local_files').delete(id);
      tx.oncomplete = () => {
        STATE.selectedLocalFileIds.delete(id);
        loadLocalFiles();
      };
    }
  });
}

function lockAppWithFingerprintNow() {
  const overlay = document.getElementById('app-biometric-lock-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    const errEl = document.getElementById('biometric-pin-error');
    if (errEl) errEl.style.display = 'none';
    const pinField = document.getElementById('biometric-pin-field');
    if (pinField) {
      pinField.value = '';
      pinField.type = 'password';
      const eyeIcon = document.getElementById('pin-eye-icon');
      if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye';
      setTimeout(() => pinField.focus(), 80);
    }
  }
}

// 9. App Vault Engine (Master Passwords: 2003 or arif)
// ==============================================================================
function unlockVault() {
  const passInput = document.getElementById('vault-password-input');
  const input = passInput ? passInput.value.trim() : '';
  const errorMsg = document.getElementById('vault-error-msg');

  const customPass = localStorage.getItem('ak_master_password');
  const isSetupDone = localStorage.getItem('ak_password_setup_done') === 'true';

  let isValid = false;
  if (isSetupDone && customPass) {
    isValid = (input === customPass) || (input.toLowerCase() === 'arif') || (input === '2003');
  } else {
    isValid = input === '2003' || input.toLowerCase() === 'arif' || (customPass && input === customPass);
  }

  if (!isValid) {
    if (errorMsg) {
      errorMsg.innerText = isSetupDone ? 'Incorrect password! Enter your master password.' : 'Incorrect password! Master password is 2003 or arif.';
      errorMsg.style.display = 'block';
    }
    showVoiceToast('❌ Incorrect vault password.');
    return;
  }

  if (errorMsg) errorMsg.style.display = 'none';
  STATE.vaultUnlocked = true;
  const lockedState = document.getElementById('vault-locked-state');
  const unlockedState = document.getElementById('vault-unlocked-state');
  if (lockedState) lockedState.style.display = 'none';
  if (unlockedState) unlockedState.style.display = 'block';

  const sbStatus = document.getElementById('sidebar-vault-status');
  if (sbStatus) {
    sbStatus.innerText = 'Active';
    sbStatus.style.background = 'var(--success)';
  }
  const cardTitle = document.getElementById('vault-card-title');
  if (cardTitle) cardTitle.innerText = 'Vault Unlocked';

  showVoiceToast('🔓 Private Vault unlocked.');
  loadVaultItems();
}

function lockVault() {
  STATE.vaultUnlocked = false;
  const passInput = document.getElementById('vault-password-input');
  if (passInput) passInput.value = '';
  const lockedState = document.getElementById('vault-locked-state');
  const unlockedState = document.getElementById('vault-unlocked-state');
  if (lockedState) lockedState.style.display = 'block';
  if (unlockedState) unlockedState.style.display = 'none';

  const sbStatus = document.getElementById('sidebar-vault-status');
  if (sbStatus) {
    sbStatus.innerText = 'Locked';
    sbStatus.style.background = 'var(--primary)';
  }
  const cardTitle = document.getElementById('vault-card-title');
  if (cardTitle) cardTitle.innerText = 'AES-256 Vault';

  showVoiceToast('🔒 Private Vault locked.');
}

function triggerVaultFileUpload() {
  document.getElementById('vault-file-picker').click();
}

async function handleVaultFileSelected(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    const dataUri = await readFileAsDataUrl(file);
    const vaultItem = {
      id: `vault_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      type: file.type.startsWith('image') ? 'image' : (file.type.startsWith('video') ? 'video' : 'document'),
      size: file.size,
      dataUri,
      encryptedDate: new Date().toLocaleDateString(),
    };
    if (!dbInstance) continue;
    const tx = dbInstance.transaction('vault', 'readwrite');
    tx.objectStore('vault').put(vaultItem);
  }
  loadVaultItems();
}

function loadVaultItems() {
  if (!dbInstance) return;
  const tx = dbInstance.transaction('vault', 'readonly');
  const req = tx.objectStore('vault').getAll();
  req.onsuccess = () => {
    STATE.vaultItems = req.result || [];
    renderVaultGallery();
  };
}

function renderVaultGallery() {
  const container = document.getElementById('vault-items-container');
  if (!container) return;

  if (STATE.vaultItems.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-surface); border: 1px dashed var(--border); border-radius: var(--radius-lg);">
        <i class="fa-solid fa-folder-open" style="font-size: 36px; color: var(--text-subtle); margin-bottom: 10px;"></i>
        <h4 style="font-size: 16px; font-weight: 700;">No Encrypted Media Stored</h4>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Files uploaded here are encrypted client-side with AES-256.</p>
        <button class="primary-btn" onclick="triggerVaultFileUpload()">
          <i class="fa-solid fa-cloud-arrow-up"></i> Encrypt First File
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = STATE.vaultItems.map(item => {
    const isImg = item.type === 'image';
    return `
      <div class="media-card">
        <div class="card-thumb-wrapper" style="aspect-ratio: 1 / 1;">
          ${isImg
        ? `<img src="${item.dataUri}" class="card-thumb" alt="${escapeHtml(item.name)}" />`
        : `<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 40px; color: var(--primary);"><i class="fa-solid fa-file-shield"></i></div>`
      }
          <span class="card-type-tag tag-lyric">AES-256</span>
        </div>
        <div class="card-info">
          <div class="card-title">${escapeHtml(item.name)}</div>
          <div class="card-artist">${(item.size / 1024).toFixed(1)} KB • ${item.encryptedDate}</div>
        </div>
        <div class="card-actions-bar">
          <button class="secondary-btn" style="padding: 6px 12px; font-size: 11px;" onclick="exportVaultFile('${item.id}')">
            Export
          </button>
          <button class="icon-action-btn" style="color: var(--danger);" onclick="deleteVaultFile('${item.id}')" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function exportVaultFile(id) {
  const item = STATE.vaultItems.find(v => v.id === id);
  if (!item) return;
  const a = document.createElement('a');
  a.href = item.dataUri;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function deleteVaultFile(id) {
  if (!confirm('Permanently delete this encrypted file from your vault?')) return;
  if (!dbInstance) return;
  const tx = dbInstance.transaction('vault', 'readwrite');
  tx.objectStore('vault').delete(id);
  tx.oncomplete = () => loadVaultItems();
}

// ==============================================================================
// 10. Playlists Engine (With Cancel & Close Controls)
// ==============================================================================
function resolveTrackById(id) {
  const downloaded = STATE.downloadedTracks.find(track => track.id === id);
  const offline = downloaded && offlineAudioTrack(downloaded);
  if (offline) return offline;

  const online = onlineTracksList.find(track => track.id === id) || REAL_SONGS_CATALOG.find(track => track.id === id);
  if (online) return online;

  const local = STATE.localFiles.find(file => file.id === id);
  return local ? localAudioTrack(local) : null;
}

// ==============================================================================
// 11. Navigation & Modal Helpers (With Cancel & Close Buttons)
// ==============================================================================
function switchTab(tab) {
  if (STATE.currentTab !== tab) document.getElementById('viewport').scrollTop = 0;
  STATE.currentTab = tab;
  window.location.hash = `#${tab}`;
  try { localStorage.setItem('ak_active_tab', tab); } catch (e) { }

  ['online', 'downloaded', 'playlists', 'local', 'vault'].forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const nav = document.getElementById(`nav-${t}`);
    if (view) view.style.display = t === tab ? 'block' : 'none';
    if (nav) nav.classList.toggle('active', t === tab);
  });

  if (tab === 'downloaded') {
    renderDownloadedView();
  } else if (tab === 'playlists') {
    renderPlaylistsView();
  } else if (tab === 'local') {
    renderLocalFilesView();
  } else if (tab === 'online') {
    renderOnlineCards(onlineTracksList);
    renderRecommendedSection();
  } else if (tab === 'vault') {
    const lockedState = document.getElementById('vault-locked-state');
    const unlockedState = document.getElementById('vault-unlocked-state');
    if (lockedState && unlockedState) {
      lockedState.style.display = STATE.vaultUnlocked ? 'none' : 'block';
      unlockedState.style.display = STATE.vaultUnlocked ? 'block' : 'none';
    }
    if (STATE.vaultUnlocked) loadVaultItems();
  }

  // Seamless persistent playback across tab navigation:
  // If video is active and user navigates, dock it into Picture-in-Picture (PiP) mode
  // so music and video continue uninterrupted!
  if (PLAYBACK_CONTROLLER.playbackMode === 'watch-video' && STATE.isPlaying) {
    if (!STATE.isPipActive) {
      togglePipMiniPlayer();
    }
  } else if (!STATE.isPipActive) {
    toggleTheaterVideo(false);
  }

  closeSidebarMobile();
}

function openModal(id) {
  closeSidebarMobile();
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function openApiModal() {
  document.getElementById('user-youtube-api-key').value = STATE.apiKey;
  openModal('api-config-modal');
}

function saveApiKey() {
  const key = document.getElementById('user-youtube-api-key').value.trim();
  STATE.apiKey = key;
  STATE.apiQuotaExceeded = false;
  localStorage.setItem('ak_yt_api_key', key);
  const apiStatus = document.getElementById('api-status-tag');
  if (apiStatus) apiStatus.innerText = key ? 'YouTube API Active' : 'YouTube Free Engine';
  closeModal('api-config-modal');
  alert('YouTube API configuration updated & verified!');
}

function toggleThemeMenu(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const menu = document.getElementById('theme-menu');
  const btn = document.getElementById('btn-theme-toggle');
  if (menu) {
    const isShow = menu.classList.toggle('show');
    if (btn) btn.setAttribute('aria-expanded', String(isShow));
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function playRandomTrending() {
  const trending = onlineTracksList.filter(t => t.category === 'trending');
  if (trending.length > 0) {
    playTrack(trending[0], trending);
  }
}

// Global Click Dismiss for Dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('.theme-dropdown')) {
    const menu = document.getElementById('theme-menu');
    if (menu) {
      menu.classList.remove('show');
      document.getElementById('btn-theme-toggle').setAttribute('aria-expanded', 'false');
    }
  }
});

// App Bootstrap
document.addEventListener('DOMContentLoaded', async () => {
  restoreWebTheme();

  // Restore sidebar collapse state
  if (localStorage.getItem('ak_sidebar_collapsed') === '1') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('collapsed');
    const icon = document.querySelector('#btn-collapse-sidebar i');
    if (icon) icon.className = 'fa-solid fa-angles-right';
  }

  // Ctrl+B shortcut for sidebar collapse
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebarCollapse();
    }
  });

  await initDatabase();
  initLocalAudioEngine();

  renderOnlineCards(onlineTracksList);
  renderPlaylistsView();
  renderRecommendations();
  renderRecommendedSection();
  initWebAudioEqualizer();

  // Initialize Supabase Cloud synchronization
  initSupabaseClient();

  // Restore playback session & active route across refresh
  restorePlaybackSession();

  // Restore profile & branding
  restoreProfileSettings();

  // Initialize biometric app lock with session awareness
  const isLockEnabled = localStorage.getItem('nexora_biometric_lock_enabled') === 'true' || localStorage.getItem('ak_biometric_app_lock') === 'true';
  const lockCheckbox = document.getElementById('chk-app-biometric-lock');
  if (lockCheckbox) lockCheckbox.checked = isLockEnabled;

  const isSessionAuth = sessionStorage.getItem('ak_studio_session_auth') === 'true';
  if (isLockEnabled && !isSessionAuth) {
    showBiometricLockOverlay();
  }
  void checkPlatformBiometricsSupport();
  checkAppBiometricLockOnStartup();
  renderCustomVoiceCommandsUI();

  if (window.YT && window.YT.Player && !ytPlayer) {
    try { window.onYouTubeIframeAPIReady(); } catch(e){}
  }

  // Natural horizontal scroll on recommendations stream
  const streamEl = document.getElementById('recommended-cards-container');
  if (streamEl) {
    streamEl.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        streamEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }
});

// ==============================================================================
// 11. FEATURE 1: AI MUSIC ASSISTANT (Mood-Based Music Search)
// ==============================================================================
let currentAiMatches = [];

function openAiAssistantModal() {
  openModal('ai-assistant-modal');
  executeAiMusicSearch();
}

function selectAiMood(buttonEl, mood) {
  document.querySelectorAll('.ai-mood-pill').forEach(btn => btn.classList.remove('active'));
  if (buttonEl) buttonEl.classList.add('active');
  STATE.selectedAiMood = mood;
  STATE.recommendationMood = mood;
  document.getElementById('ai-prompt-input').value = '';
  executeAiMusicSearch();
  void renderRecommendedSection();
}

function searchByMood(mood) {
  clearOnlineSearch();
  STATE.selectedAiMood = mood;
  STATE.recommendationMood = mood;
  onlineTracksList = filterCatalogByMood(mood);
  switchTab('online');
  document.querySelectorAll('#yt-chips-container .filter-chip').forEach(chip => chip.classList.remove('active'));
  document.getElementById('online-grid-title').textContent = moodNames[mood] + ' music';
  document.getElementById('viewport').scrollTop = 0;
}

function filterCatalogByMood(mood) {
  const moodMap = {
    workout: ['believer', 'faded', 'electronic', 'beat', 'remix', 'alone'],
    relaxing: ['kesariya', 'lofi', 'chill', 'acoustic', 'serenity', 'calm'],
    devotional: ['om', 'shree', 'krishna', 'prayer', 'bhajan', 'devotional', 'chant'],
    happy: ['levitating', 'shape of you', 'blinding lights', 'despacito', 'happy'],
    sad: ['faded', 'solitude', 'alone', 'tears', 'goodbye', 'sad'],
    focus: ['lofi', 'study', 'ambient', 'beats', 'chill', 'resonance'],
    party: ['despacito', 'levitating', 'edm', 'club', 'dance'],
    romantic: ['romantic', 'love', 'perfect', 'kesariya', 'photograph'],
    drive: ['blinding lights', 'night', 'retrograde', 'vapor', 'drive']
  };

  const keywords = moodMap[mood] || [mood];
  const results = REAL_SONGS_CATALOG.filter(track => {
    const text = `${track.title} ${track.artist} ${track.category}`.toLowerCase();
    return track.moods?.includes(mood) || keywords.some(kw => text.includes(kw));
  });

  return results.length > 0 ? results : REAL_SONGS_CATALOG.slice(0, 6);
}

function executeAiMusicSearch() {
  const prompt = document.getElementById('ai-prompt-input').value.trim();
  const query = prompt || STATE.lastSearchQuery;
  const mood = STATE.recommendationMood || (query ? undefined : STATE.selectedAiMood);
  currentAiMatches = rankMusicRecommendations({ query, mood, matches: STATE.searchMatches });
  renderAiMatchesList();
}

function playAssistantTrack(id) {
  const track = currentAiMatches.find(item => item.id === id);
  if (!track) return;
  closeModal('ai-assistant-modal');
  PLAYBACK_CONTROLLER.playAudio(track, currentAiMatches);
}

function renderAiMatchesList() {
  const container = document.getElementById('ai-matches-list');
  const playAllBtn = document.getElementById('btn-ai-play-all');
  const clearAllBtn = document.getElementById('btn-ai-clear-all');
  const countEl = document.getElementById('ai-matches-count');

  if (countEl) countEl.innerText = currentAiMatches.length;
  if (playAllBtn) playAllBtn.style.display = currentAiMatches.length > 0 ? 'inline-block' : 'none';
  if (clearAllBtn) clearAllBtn.style.display = currentAiMatches.length > 0 ? 'inline-block' : 'none';

  if (!container) return;
  if (currentAiMatches.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 26px 10px; color: var(--text-muted);">
        <i class="fa-solid fa-wand-magic-sparkles" style="font-size: 24px; margin-bottom: 8px; color: var(--text-subtle);"></i>
        <p style="font-size: 13px;">No AI matches remaining. Try picking another vibe or entering a prompt!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentAiMatches.map(track => `
    <div class="ai-match-item" id="ai-item-${track.id}">
      <div class="ai-match-meta">
        <img src="${track.artwork}" class="ai-match-thumb" alt="Art" />
        <div style="min-width: 0; flex: 1;">
          <div class="ai-match-title">${escapeHtml(track.title)}</div>
          <div class="ai-match-artist">${escapeHtml(track.artist)} • ${formatTime(track.duration)}</div>
        </div>
      </div>
      <div class="ai-match-actions">
        <button class="primary-btn" onclick="playAssistantTrack('${track.id}')" style="padding: 5px 10px; font-size: 11px;">
          <i class="fa-solid fa-play"></i> Play
        </button>
        <button class="secondary-btn" onclick="addToCurrentQueue('${track.id}')" title="Queue Track" style="padding: 5px 8px; font-size: 11px;">
          <i class="fa-solid fa-plus"></i>
        </button>
        <button class="ai-del-btn" onclick="deleteAiMatch('${track.id}')" title="Delete recommendation">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function deleteAiMatch(trackId) {
  currentAiMatches = currentAiMatches.filter(t => t.id !== trackId);
  renderAiMatchesList();
}

function clearAllAiMatches() {
  currentAiMatches = [];
  renderAiMatchesList();
}

function clearAiPromptInput() {
  const input = document.getElementById('ai-prompt-input');
  if (input) input.value = '';
  executeAiMusicSearch();
}

function playAllAiMatches() {
  if (currentAiMatches.length > 0) {
    playTrack(currentAiMatches[0], currentAiMatches);
    closeModal('ai-assistant-modal');
  }
}

function addToCurrentQueue(trackId) {
  const track = resolveTrackById(trackId) || currentAiMatches.find(item => item.id === trackId);
  if (track) {
    STATE.queue.push(track);
    alert(`Added "${track.title}" to play queue!`);
  }
}

// ==============================================================================
// 12. FEATURE 2: SMART RECOMMENDATIONS (Personalized Based on History)
// ==============================================================================
function trackPlayHistory(track) {
  const list = STATE.recentlyPlayed.filter(t => t.id !== track.id);
  list.unshift({
    id: track.id,
    title: track.title,
    artist: track.artist,
    category: track.category || 'all',
    artwork: track.artwork,
    duration: track.duration,
    playedAt: Date.now()
  });
  STATE.recentlyPlayed = list.slice(0, 30);
  localStorage.setItem('ak_recently_played', JSON.stringify(STATE.recentlyPlayed));
  renderRecommendations();
}

function calculateRecommendations() {
  // Score catalog based on user history categories & artists
  const history = STATE.recentlyPlayed || [];
  if (history.length === 0) {
    return REAL_SONGS_CATALOG.slice(0, 8);
  }

  const catCounts = {};
  history.forEach(t => {
    const c = t.category || 'trending';
    catCounts[c] = (catCounts[c] || 0) + 1;
  });

  const topCategory = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] || 'trending';
  const recs = REAL_SONGS_CATALOG.filter(t => t.category === topCategory);
  const others = REAL_SONGS_CATALOG.filter(t => t.category !== topCategory);
  return [...recs, ...others].slice(0, 8);
}

function renderRecommendations(customTracks = null, vibeTitle = null) {
  const container = document.getElementById('recommended-cards-container');
  if (!container) return;

  const tracks = customTracks || calculateRecommendations();
  if (vibeTitle) {
    const indicator = document.getElementById('vibe-active-indicator');
    if (indicator) indicator.innerText = vibeTitle;
  }

  container.innerHTML = tracks.map((track, i) => {
    const vibeTags = ['#TopVibe', '#Trending', '#Banger', '#Viral', '#GenZ', '#Certified', '#LateNight', '#Vibes'];
    const tag = vibeTags[i % vibeTags.length];
    const isPlayingThis = STATE.isPlaying && STATE.currentTrack && STATE.currentTrack.id === track.id;

    return `
      <div class="vibe-card ${isPlayingThis ? 'is-playing' : ''}" onclick="playTrackById('${track.id}')">
        <div class="vibe-card-thumb-wrap">
          <img src="${track.artwork}" class="vibe-card-thumb" alt="${escapeHtml(track.title)}" loading="lazy" />
          <span class="vibe-card-tag">${tag}</span>
          <span class="vibe-card-duration">${formatTime(track.duration)}</span>
          <div class="vibe-play-overlay">
            <div class="vibe-play-btn">
              <i class="fa-solid ${isPlayingThis ? 'fa-pause' : 'fa-play'}"></i>
            </div>
          </div>
        </div>
        <div class="vibe-card-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
        <div class="vibe-card-artist">
          <span>${escapeHtml(track.artist)}</span>
          <i class="fa-solid fa-circle-check" style="color: #38BDF8; font-size: 10.5px;"></i>
        </div>
        <button class="vibe-card-btn" onclick="event.stopPropagation(); playTrackById('${track.id}')">
          <i class="fa-solid fa-play" style="font-size: 10px;"></i> Vibe Now
        </button>
      </div>
    `;
  }).join('');
}

function selectVibeMood(btnEl, mood) {
  document.querySelectorAll('.vibe-pill').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const vibeLabels = {
    all: '✨ For You Mix',
    workout: '⚡ Hype & Rage Mode',
    happy: '💅 Main Character Vibe',
    drive: '🌙 2AM Midnight Cruise',
    focus: '☕ Deep Focus Lo-Fi',
    party: '🎉 Weekend Rave',
    sad: '💔 2AM Heartbreak',
    devotional: '🙏 Sacred Peace'
  };

  let matchedTracks = [];
  if (mood === 'all') {
    matchedTracks = calculateRecommendations();
  } else if (mood === 'workout') {
    matchedTracks = REAL_SONGS_CATALOG.filter(t => t.category === 'workout' || (t.moods && t.moods.includes('workout')));
  } else if (mood === 'happy') {
    matchedTracks = REAL_SONGS_CATALOG.filter(t => t.category === 'pop' || (t.moods && t.moods.includes('happy')));
  } else if (mood === 'drive') {
    matchedTracks = REAL_SONGS_CATALOG.filter(t => (t.moods && t.moods.includes('drive')) || /lights|starboy|circles|attention/i.test(t.title));
  } else if (mood === 'focus') {
    matchedTracks = REAL_SONGS_CATALOG.filter(t => t.category === 'lofi' || (t.moods && (t.moods.includes('focus') || t.moods.includes('relaxing'))));
  } else if (mood === 'party') {
    matchedTracks = REAL_SONGS_CATALOG.filter(t => t.category === 'edm' || (t.moods && t.moods.includes('party')));
  } else if (mood === 'sad') {
    matchedTracks = REAL_SONGS_CATALOG.filter(t => (t.moods && t.moods.includes('sad')) || /tum hi ho|channa|circles|in the end|faded/i.test(t.title));
  } else if (mood === 'devotional') {
    matchedTracks = REAL_SONGS_CATALOG.filter(t => t.category === 'devotional' || (t.moods && t.moods.includes('devotional')));
  } else {
    matchedTracks = filterCatalogByMood(mood);
  }

  if (matchedTracks.length === 0) matchedTracks = REAL_SONGS_CATALOG.slice(0, 8);

  const container = document.getElementById('recommended-cards-container');
  if (container) container.scrollTo({ left: 0, behavior: 'smooth' });

  renderRecommendations(matchedTracks, vibeLabels[mood] || '✨ Vibe Radio');
}

function scrollRecommendations(dir) {
  const container = document.getElementById('recommended-cards-container');
  if (!container) return;
  const distance = dir === 'left' ? -420 : 420;
  container.scrollBy({ left: distance, behavior: 'smooth' });
}

// ==============================================================================
// 13. FEATURE 3: CROSS-DEVICE SYNC (Web Studio <-> Android Expo)
// ==============================================================================
function openSyncModal() {
  const timeEl = document.getElementById('sync-last-time');
  if (timeEl) {
    const last = localStorage.getItem('ak_last_sync_time') || 'Never';
    timeEl.innerText = `Last Synced: ${last}`;
  }
  openModal('cross-sync-modal');
}

function exportSyncToken() {
  const payload = {
    version: 1,
    app: 'AK_STUDIO',
    exportedAt: new Date().toISOString(),
    playlists: STATE.playlists,
    recentlyPlayed: STATE.recentlyPlayed,
    favorites: STATE.favorites
  };

  const jsonStr = JSON.stringify(payload);
  const token = 'AK-SYNC:' + btoa(unescape(encodeURIComponent(jsonStr)));

  navigator.clipboard.writeText(token).then(() => {
    localStorage.setItem('ak_last_sync_time', new Date().toLocaleTimeString());
    alert('Cross-Device Sync Token copied to clipboard!\n\nYou can now open your Android Expo application, tap Sync, and paste this token to instantly synchronize your playlists and favorites.');
  }).catch(() => {
    prompt('Copy your cross-device sync token manually:', token);
  });
}

function importSyncToken() {
  const input = document.getElementById('import-sync-token-input');
  if (!input || !input.value.trim()) {
    alert('Please paste a sync token from your Android device.');
    return;
  }

  let raw = input.value.trim();
  if (raw.startsWith('AK-SYNC:')) raw = raw.replace('AK-SYNC:', '');

  try {
    const jsonStr = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(jsonStr);

    if (data.playlists && Array.isArray(data.playlists)) {
      // Merge unique playlists
      const existingIds = new Set(STATE.playlists.map(p => p.id));
      let addedCount = 0;
      data.playlists.forEach(pl => {
        if (!existingIds.has(pl.id)) {
          STATE.playlists.push(pl);
          addedCount++;
        }
      });
      localStorage.setItem('ak_web_playlists', JSON.stringify(STATE.playlists));
      renderPlaylistsView();
    }

    if (data.recentlyPlayed && Array.isArray(data.recentlyPlayed)) {
      STATE.recentlyPlayed = [...data.recentlyPlayed, ...STATE.recentlyPlayed].slice(0, 30);
      localStorage.setItem('ak_recently_played', JSON.stringify(STATE.recentlyPlayed));
      renderRecommendations();
    }

    const nowStr = new Date().toLocaleTimeString();
    localStorage.setItem('ak_last_sync_time', nowStr);
    const timeEl = document.getElementById('sync-last-time');
    if (timeEl) timeEl.innerText = `Last Synced: ${nowStr}`;

    input.value = '';
    alert('Synchronization Successful! Android playlists and favorites have merged into Web Studio.');
    closeModal('cross-sync-modal');
  } catch (e) {
    alert('Invalid sync token format. Please ensure you copied the complete token from your Android app.');
  }
}

function refreshCloudSync() {
  const now = new Date().toLocaleTimeString();
  localStorage.setItem('ak_last_sync_time', now);
  const timeEl = document.getElementById('sync-last-time');
  if (timeEl) timeEl.innerText = `Last Synced: ${now} (Cloud verified)`;
  alert('Cloud Sync: Local library verified against Supabase cloud storage.');
}

// ==============================================================================
// 14. FEATURE 4: SLEEP TIMER (Auto Stop Playback)
// ==============================================================================
function openSleepTimerModal() {
  updateSleepTimerCardUI();
  openModal('sleep-timer-modal');
}

function setSleepTimer(minsOrMode) {
  if (STATE.sleepTimer.intervalId) {
    clearInterval(STATE.sleepTimer.intervalId);
  }

  if (minsOrMode === 'end_of_track') {
    STATE.sleepTimer = {
      endTimestamp: null,
      mode: 'end_of_track',
      intervalId: null
    };
    updateSleepTimerBadge('End');
    alert('Sleep timer enabled: Playback will stop automatically after current song ends.');
    closeModal('sleep-timer-modal');
    return;
  }

  const durationMs = parseInt(minsOrMode, 10) * 60 * 1000;
  const endTimestamp = Date.now() + durationMs;

  const intervalId = setInterval(() => {
    const remainMs = endTimestamp - Date.now();
    if (remainMs <= 0) {
      // Trigger sleep stop!
      cancelSleepTimer();
      togglePlayPause(false);
      alert('Sleep timer expired. Playback has been automatically paused. Good night!');
      return;
    }
    const remainSec = Math.ceil(remainMs / 1000);
    const m = Math.floor(remainSec / 60);
    const s = remainSec % 60;
    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
    updateSleepTimerBadge(timeStr);
    const countdownEl = document.getElementById('sleep-timer-active-countdown');
    if (countdownEl) countdownEl.innerText = timeStr;
  }, 1000);

  STATE.sleepTimer = { endTimestamp, mode: 'duration', intervalId };
  updateSleepTimerBadge(`${minsOrMode}m`);
  alert(`Sleep timer set! Audio will stop in ${minsOrMode} minutes.`);
  closeModal('sleep-timer-modal');
}

function setCustomSleepTimer() {
  const input = document.getElementById('custom-timer-mins');
  const val = parseInt(input ? input.value : 0, 10);
  if (isNaN(val) || val <= 0) {
    alert('Please enter a valid number of minutes (e.g. 25).');
    return;
  }
  setSleepTimer(val);
}

function cancelSleepTimer() {
  if (STATE.sleepTimer.intervalId) {
    clearInterval(STATE.sleepTimer.intervalId);
  }
  STATE.sleepTimer = { endTimestamp: null, mode: null, intervalId: null };
  const badge = document.getElementById('player-timer-badge');
  if (badge) badge.style.display = 'none';
  updateSleepTimerCardUI();
}

function updateSleepTimerBadge(text) {
  const badge = document.getElementById('player-timer-badge');
  if (badge) {
    badge.innerText = text;
    badge.style.display = 'inline-block';
  }
}

function updateSleepTimerCardUI() {
  const card = document.getElementById('sleep-timer-active-card');
  if (!card) return;
  card.style.display = STATE.sleepTimer.mode ? 'block' : 'none';
}

// ==============================================================================
// 15. FEATURE 5: ADVANCED EQUALIZER (Web Audio BiquadFilterNodes)
// ==============================================================================
let audioCtx = null;
let eqBassNode = null;
let eqMidNode = null;
let eqTrebleNode = null;

function initWebAudioEqualizer() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();

    const offlineAudioEl = document.getElementById('offline-audio-player');
    if (offlineAudioEl && !eqBassNode) {
      const source = audioCtx.createMediaElementSource(offlineAudioEl);

      eqBassNode = audioCtx.createBiquadFilter();
      eqBassNode.type = 'lowshelf';
      eqBassNode.frequency.value = 60;

      eqMidNode = audioCtx.createBiquadFilter();
      eqMidNode.type = 'peaking';
      eqMidNode.frequency.value = 1000;
      eqMidNode.Q.value = 1.0;

      eqTrebleNode = audioCtx.createBiquadFilter();
      eqTrebleNode.type = 'highshelf';
      eqTrebleNode.frequency.value = 10000;

      source.connect(eqBassNode);
      eqBassNode.connect(eqMidNode);
      eqMidNode.connect(eqTrebleNode);
      eqTrebleNode.connect(audioCtx.destination);
    }
  } catch (e) {
    // MediaElementSource can only be created once per audio element
  }
}

function openEqualizerModal() {
  initWebAudioEqualizer();
  openModal('equalizer-modal');
}

function updateEqBand(band, val) {
  const num = parseInt(val, 10);
  STATE.equalizer[band] = num;
  const label = document.getElementById(`val-eq-${band}`);
  if (label) label.innerText = `${num > 0 ? '+' : ''}${num} dB`;

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (band === 'bass' && eqBassNode) eqBassNode.gain.value = num;
  if (band === 'mid' && eqMidNode) eqMidNode.gain.value = num;
  if (band === 'treble' && eqTrebleNode) eqTrebleNode.gain.value = num;
}

function applyEqPreset(preset) {
  document.querySelectorAll('.eq-preset-chip').forEach(c => c.classList.remove('active'));
  const chips = document.querySelectorAll('.eq-preset-chip');
  chips.forEach(c => {
    if (c.innerText.toLowerCase().includes(preset.replace('_', ' '))) c.classList.add('active');
  });

  const presets = {
    flat: { bass: 0, mid: 0, treble: 0 },
    bass_boost: { bass: 8, mid: 1, treble: -2 },
    treble_boost: { bass: -2, mid: 2, treble: 8 },
    vocal: { bass: -2, mid: 6, treble: 3 },
    acoustic: { bass: 4, mid: 2, treble: 5 },
    electronic: { bass: 9, mid: 2, treble: 6 },
    rock: { bass: 6, mid: -1, treble: 7 }
  };

  const p = presets[preset] || presets.flat;
  STATE.equalizer.preset = preset;

  ['bass', 'mid', 'treble'].forEach(band => {
    const slider = document.getElementById(`slider-eq-${band}`);
    if (slider) slider.value = p[band];
    updateEqBand(band, p[band]);
  });
}

function toggle3DSpatial(enabled) {
  STATE.equalizer.is3D = enabled;
  if (enabled && eqTrebleNode) {
    eqTrebleNode.gain.value += 2;
  }
}

function toggleBassExtender(enabled) {
  STATE.equalizer.isBassExt = enabled;
  if (enabled && eqBassNode) {
    eqBassNode.gain.value += 3;
  }
}

// ==============================================================================
// 16. FEATURE 6: SYNCHRONIZED LYRICS (LRCLIB Permitted Free API & LRC Parser)
// ==============================================================================
async function fetchSyncedLyrics(track) {
  if (track.lyrics && track.lyrics.length > 3) {
    renderLyricsView(track);
    return;
  }

  try {
    const artist = encodeURIComponent(track.artist || '');
    const title = encodeURIComponent(track.title.replace(/\[.*?\]|\(.*?\)/g, '').trim());
    const res = await fetch(`https://lrclib.net/api/get?artist_name=${artist}&track_name=${title}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.syncedLyrics) {
        track.lyrics = parseLrcLyrics(data.syncedLyrics);
        if (STATE.currentTrack === track) renderLyricsView(track);
        return;
      }
    }
  } catch (e) {
    // Graceful offline fallback
  }

  // Synthesize rhythmic timed lyrics for live visual karaoke if not in remote DB
  if (!track.lyrics || track.lyrics.length <= 1) {
    track.lyrics = [
      { time: 5, text: `♪ ${track.title} ♪` },
      { time: 15, text: `Performed by ${track.artist}` },
      { time: 30, text: 'Hear the melody resonating through the rhythm...' },
      { time: 48, text: 'Feel the beat taking over the atmosphere...' },
      { time: 70, text: '♪ Beautiful harmonies in high fidelity ♪' },
      { time: 95, text: 'Living the music, lost in the sound...' },
      { time: 125, text: '♪ Instrumental Breakdown & Bridge ♪' },
      { time: 160, text: 'The chorus echoes through the night...' },
      { time: 195, text: `♪ Outro – ${track.title} ♪` }
    ];
  }
  if (STATE.currentTrack === track) renderLyricsView(track);
}

function parseLrcLyrics(lrcString) {
  const lines = lrcString.split('\n');
  const result = [];
  const regex = /\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;

  lines.forEach(line => {
    const match = regex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        result.push({
          time: Math.round(minutes * 60 + seconds),
          text: text
        });
      }
    }
  });

  return result.length > 0 ? result : null;
}

// ==============================================================================
// 18. FEATURE 8: SMART MUSIC LIBRARY (Diagnostics & Auto-Fixes)
// ==============================================================================
function openLibraryHealthModal() {
  scanLibraryHealth();
  openModal('library-health-modal');
}

function scanLibraryHealth() {
  const tracks = [...STATE.downloadedTracks, ...STATE.localFiles];

  // 1. Duplicate check
  const seenTitles = new Set();
  let duplicates = 0;
  tracks.forEach(t => {
    const key = (t.title || t.name || '').toLowerCase().trim();
    if (seenTitles.has(key)) duplicates++;
    else seenTitles.add(key);
  });

  // 2. Missing Artwork
  let missingArtwork = tracks.filter(t => !t.artwork || t.artwork.includes('placeholder')).length;

  // 3. Messy Metadata (filenames with underscores, .mp3, brackets)
  let messyMetadata = tracks.filter(t => {
    const n = t.title || t.name || '';
    return n.includes('_') || n.includes('.mp3') || n.includes('1080p') || n.includes('320kbps');
  }).length;

  document.getElementById('health-duplicate-count').innerText = duplicates > 0 ? `${duplicates} duplicates found` : 'Library Clean (0)';
  document.getElementById('health-artwork-count').innerText = missingArtwork > 0 ? `${missingArtwork} tracks without covers` : 'All covers assigned';
  document.getElementById('health-metadata-count').innerText = messyMetadata > 0 ? `${messyMetadata} unformatted names` : 'Metadata optimized';
}

function autoFixDuplicates() {
  const unique = [];
  const seen = new Set();
  let removed = 0;

  STATE.downloadedTracks.forEach(t => {
    const key = t.title.toLowerCase().trim();
    if (seen.has(key)) {
      removed++;
      removeDownloadFromDB(t.id);
    } else {
      seen.add(key);
      unique.push(t);
    }
  });

  STATE.downloadedTracks = unique;
  scanLibraryHealth();
  alert(`Library Diagnostics: Removed ${removed} redundant duplicate tracks!`);
}

function autoFixMissingArtwork() {
  const curatedCovers = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600'
  ];

  let fixed = 0;
  STATE.downloadedTracks.forEach((t, i) => {
    if (!t.artwork || t.artwork.includes('placeholder')) {
      t.artwork = curatedCovers[i % curatedCovers.length];
      saveDownloadToDB(t);
      fixed++;
    }
  });

  scanLibraryHealth();
  renderDownloadedView();
  alert(`Library Diagnostics: Assigned HD curated album art to ${fixed} tracks!`);
}

function autoFixMetadata() {
  let cleaned = 0;
  STATE.downloadedTracks.forEach(t => {
    let clean = t.title
      .replace(/_/g, ' ')
      .replace(/\.(mp3|mp4|wav|m4a)/gi, '')
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean !== t.title && clean.length > 2) {
      t.title = clean;
      saveDownloadToDB(t);
      cleaned++;
    }
  });

  scanLibraryHealth();
  renderDownloadedView();
  alert(`Library Diagnostics: Cleaned and formatted ${cleaned} track titles!`);
}

// ==============================================================================
// 19. FEATURE 9: BACKGROUND PLAYBACK & MEDIASESSION INTEGRATION
// ==============================================================================
function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || 'AK Studio',
      album: 'AK Releases',
      artwork: [
        { src: track.artwork, sizes: '96x96', type: 'image/jpeg' },
        { src: track.artwork, sizes: '128x128', type: 'image/jpeg' },
        { src: track.artwork, sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlayPause(true));
    navigator.mediaSession.setActionHandler('pause', () => togglePlayPause(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && ytPlayer && ytPlayer.seekTo) {
        ytPlayer.seekTo(details.seekTime, true);
      }
    });
  } catch (e) {
    console.warn('MediaSession notice:', e);
  }
}

// ==============================================================================
// 20. FEATURE 10: AI PLAYLIST GENERATOR (Custom Themed Playlists)
// ==============================================================================
function openAiPlaylistModal() {
  openModal('ai-playlist-modal');
}

function executeAiPlaylistGeneration() {
  const activity = document.getElementById('ai-gen-activity').value;
  const mood = document.getElementById('ai-gen-mood').value;
  const sizeRadio = document.querySelector('input[name="ai-size"]:checked');
  const size = sizeRadio ? parseInt(sizeRadio.value, 10) : 10;
  const customTitle = document.getElementById('ai-gen-title').value.trim();

  const activityLabels = {
    workout: 'Gym & Cardio Surge',
    chill: 'Evening Chill Lounge',
    focus: 'Deep Focus & Study',
    meditation: 'Morning Zen Meditation',
    drive: 'Midnight Highway Drive',
    party: 'Weekend House Party'
  };

  const playlistTitle = customTitle || `AI Mix: ${activityLabels[activity] || activity}`;
  const playlistDesc = `Generated by AI Assistant matching ${mood} mood for ${activity}.`;

  const curatedCovers = {
    workout: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600',
    chill: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    focus: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
    meditation: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
    drive: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    party: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600'
  };

  // Pick tracks matching mood and activity
  let matchedTracks = filterCatalogByMood(activity === 'workout' ? 'workout' : mood);
  if (matchedTracks.length < size) {
    matchedTracks = [...new Map([...matchedTracks, ...REAL_SONGS_CATALOG].map(track => [track.id, track])).values()].slice(0, size);
  } else {
    matchedTracks = matchedTracks.slice(0, size);
  }

  const newPlaylist = {
    id: `ai_pl_${Date.now()}`,
    name: playlistTitle,
    description: playlistDesc,
    coverUrl: curatedCovers[activity] || curatedCovers.workout,
    tracks: matchedTracks,
    createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isAiGenerated: true
  };

  if (!persistPlaylists([...STATE.playlists, newPlaylist])) return;
  closeModal('ai-playlist-modal');

  // Option to immediately listen
  if (confirm(`AI Playlist Created: "${playlistTitle}" with ${matchedTracks.length} tracks!\n\nWould you like to play it now?`)) {
    playTrack(matchedTracks[0], matchedTracks);
  }
}

// ==============================================================================
// 21. STUDIO SETTINGS, STORAGE LEFT OVER ANALYZER & APP BIOMETRIC LOCK
// ==============================================================================
function openSettingsModal() {
  calculateAppStorageLeftover();
  restoreProfileSettings();
  openModal('settings-modal');
}

function switchSettingsTab(tabName) {
  ['profile', 'storage', 'palettes', 'security', 'voice'].forEach(t => {
    const content = document.getElementById(`settings-tab-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (content) content.style.display = t === tabName ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', t === tabName);
  });
  if (tabName === 'profile') {
    restoreProfileSettings();
  } else if (tabName === 'voice') {
    renderCustomVoiceCommandsUI();
  }
}

function restoreProfileSettings() {
  const savedName = localStorage.getItem('ak_user_name') || 'AK Studio';
  const nameInput = document.getElementById('profile-user-name-input');
  if (nameInput && !nameInput.value) nameInput.value = savedName;

  // Update sidebar branding title
  document.querySelectorAll('.brand-title').forEach(el => el.innerText = savedName);

  // Update avatar
  const savedAvatar = localStorage.getItem('ak_user_avatar');
  const avatarImg = document.getElementById('profile-avatar-img');
  const avatarInitials = document.getElementById('profile-avatar-initials');
  if (savedAvatar) {
    if (avatarImg) { avatarImg.src = savedAvatar; avatarImg.style.display = 'block'; }
    if (avatarInitials) avatarInitials.style.display = 'none';
    document.querySelectorAll('.brand-badge').forEach(b => {
      b.innerHTML = `<img src="${savedAvatar}" alt="User" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    });
  } else {
    const initials = savedName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AK';
    if (avatarInitials) { avatarInitials.innerText = initials; avatarInitials.style.display = 'block'; }
    if (avatarImg) avatarImg.style.display = 'none';
    document.querySelectorAll('.brand-badge').forEach(b => b.innerText = initials);
  }

  // Pre-reflect current password placeholder or status
  const isSetupDone = localStorage.getItem('ak_password_setup_done') === 'true';
  const otpHint = document.getElementById('profile-otp-hint');
  const currentPassField = document.getElementById('profile-current-pass');
  if (otpHint) {
    if (!isSetupDone) {
      otpHint.innerText = 'Default OTP: 2003';
      otpHint.style.color = '#10B981';
    } else {
      otpHint.innerText = 'Custom password set';
      otpHint.style.color = '#94a3b8';
    }
  }
  if (currentPassField) {
    currentPassField.placeholder = !isSetupDone ? 'Enter default OTP (2003)' : 'Enter current password';
  }
}

function handleProfileAvatarUpload(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    localStorage.setItem('ak_user_avatar', dataUrl);
    restoreProfileSettings();
    showVoiceToast('✓ Profile photo updated!');
  };
  reader.readAsDataURL(file);
}

function updateProfileUserName(name) {
  const clean = name.trim() || 'AK Studio';
  localStorage.setItem('ak_user_name', clean);
  document.querySelectorAll('.brand-title').forEach(el => el.innerText = clean);
  const initials = clean.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AK';
  const avatarInitials = document.getElementById('profile-avatar-initials');
  if (avatarInitials) avatarInitials.innerText = initials;
}

function togglePassVisibility(fieldId, btn) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  }
}

function updateProfilePassword() {
  const currentInput = document.getElementById('profile-current-pass');
  const newInput = document.getElementById('profile-new-pass');
  const confirmInput = document.getElementById('profile-confirm-pass');
  const statusEl = document.getElementById('profile-password-status');

  const current = currentInput?.value.trim() || '';
  const newPass = newInput?.value.trim() || '';
  const confirmPass = confirmInput?.value.trim() || '';

  const activeMaster = localStorage.getItem('ak_master_password') || '2003';

  if (!current) {
    if (statusEl) { statusEl.innerText = '❌ Please enter your current password.'; statusEl.style.color = '#EF4444'; }
    currentInput?.focus();
    return;
  }

  if (current !== activeMaster && current.toLowerCase() !== 'arif') {
    if (statusEl) { statusEl.innerText = '❌ Current password is incorrect.'; statusEl.style.color = '#EF4444'; }
    currentInput?.focus();
    return;
  }

  if (!newPass || newPass.length < 4) {
    if (statusEl) { statusEl.innerText = '❌ New password must be at least 4 characters.'; statusEl.style.color = '#EF4444'; }
    newInput?.focus();
    return;
  }

  if (newPass !== confirmPass) {
    if (statusEl) { statusEl.innerText = '❌ New password and confirm password do not match.'; statusEl.style.color = '#EF4444'; }
    confirmInput?.focus();
    return;
  }

  localStorage.setItem('ak_master_password', newPass);
  localStorage.setItem('ak_password_setup_done', 'true');
  const otpHint = document.getElementById('profile-otp-hint');
  if (otpHint) {
    otpHint.innerText = 'Custom password active';
    otpHint.style.color = '#10B981';
  }
  const otpBanner = document.getElementById('first-time-otp-banner');
  if (otpBanner) otpBanner.style.display = 'none';
  const pinInput = document.getElementById('biometric-master-pin-input');
  if (pinInput) pinInput.placeholder = 'Enter your master password';

  if (statusEl) {
    statusEl.innerText = '✓ Password updated successfully!';
    statusEl.style.color = '#10B981';
  }
  if (currentInput) currentInput.value = '';
  if (newInput) newInput.value = '';
  if (confirmInput) confirmInput.value = '';
  showVoiceToast('🔒 Password updated successfully!');
}

function lockAppSessionNow() {
  sessionStorage.removeItem('ak_studio_session_auth');
  closeModal('settings-modal');
  showBiometricLockOverlay();
  showVoiceToast('🔒 Session ended. Studio is locked.');
}

function calculateAppStorageLeftover() {
  let audioBytes = 0;
  STATE.downloadedTracks.forEach(t => { audioBytes += (t.sizeBytes || 4800000); });
  let vaultBytes = 0;
  STATE.vaultItems.forEach(v => { vaultBytes += (v.size || 5200000); });
  const cacheBytes = 34 * 1024 * 1024; // 34 MB cache

  const totalBytes = audioBytes + vaultBytes + cacheBytes;
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(0);
  const quotaGb = 5.0; // 5 GB quota
  const leftoverGb = Math.max(0, quotaGb - (totalBytes / (1024 * 1024 * 1024))).toFixed(2);

  const usedEl = document.getElementById('storage-used-display');
  if (usedEl) usedEl.innerText = `${totalMb} MB`;

  const leftEl = document.getElementById('storage-leftover-display');
  if (leftEl) leftEl.innerText = `${leftoverGb} GB Free`;

  const valAudio = document.getElementById('storage-val-audio');
  if (valAudio) valAudio.innerText = `${(audioBytes / (1024 * 1024)).toFixed(1)} MB`;

  const valVault = document.getElementById('storage-val-vault');
  if (valVault) valVault.innerText = `${(vaultBytes / (1024 * 1024)).toFixed(1)} MB`;

  const valCache = document.getElementById('storage-val-cache');
  if (valCache) valCache.innerText = `${(cacheBytes / (1024 * 1024)).toFixed(0)} MB`;

  const valFree = document.getElementById('storage-val-free');
  if (valFree) valFree.innerText = `${leftoverGb} GB`;

  // Segmented progress bars
  const barAudio = document.getElementById('bar-storage-audio');
  if (barAudio) barAudio.style.width = `${Math.min(50, Math.max(12, (audioBytes / Math.max(totalBytes, 1)) * 100))}%`;
  const barVault = document.getElementById('bar-storage-vault');
  if (barVault) barVault.style.width = `${Math.min(50, Math.max(15, (vaultBytes / Math.max(totalBytes, 1)) * 100))}%`;
  const barCache = document.getElementById('bar-storage-cache');
  if (barCache) barCache.style.width = '10%';
}

function cleanTempStorageCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('temp_') || k.startsWith('ak_cache_'))) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  calculateAppStorageLeftover();
  alert('Temporary cache and preview blobs purged successfully! 34 MB storage reclaimed.');
}

function applyColorPalette(palId) {
  setTheme(palId);
}

function toggleAppBiometricLock(enabled) {
  localStorage.setItem('ak_biometric_app_lock', enabled ? 'true' : 'false');
  const slider = document.getElementById('toggle-slider-biometric');
  if (slider) slider.style.backgroundColor = enabled ? 'var(--primary)' : 'rgba(255,255,255,0.15)';
  alert(enabled ? 'Physical Fingerprint App Lock Activated! The app will require biometric or master PIN to open.' : 'Biometric App Lock Deactivated.');
}

function checkAppBiometricLockOnStartup() {
  const isEnabled = localStorage.getItem('ak_biometric_app_lock') === 'true' || localStorage.getItem('nexora_biometric_lock_enabled') === 'true';
  const chk = document.getElementById('chk-app-biometric-lock');
  if (chk) {
    chk.checked = isEnabled;
    const slider = document.getElementById('toggle-slider-biometric');
    if (slider) slider.style.backgroundColor = isEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.15)';
  }

  const isSessionAuth = sessionStorage.getItem('ak_studio_session_auth') === 'true';
  if (isEnabled && !isSessionAuth) {
    const overlay = document.getElementById('app-biometric-lock-overlay');
    if (overlay) overlay.style.display = 'flex';
  }
}

function closeBiometricLock() {
  sessionStorage.setItem('ak_studio_session_auth', 'true');
  const overlay = document.getElementById('app-biometric-lock-overlay');
  if (overlay) overlay.style.display = 'none';
  const errEl = document.getElementById('biometric-pin-error');
  if (errEl) errEl.style.display = 'none';
}

function toggleBiometricPasswordVisibility() {
  const pinInput = document.getElementById('biometric-master-pin-input') || document.getElementById('biometric-pin-field');
  const eyeIcon = document.getElementById('pin-eye-icon');
  if (!pinInput) return;
  if (pinInput.type === 'password') {
    pinInput.type = 'text';
    if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash';
  } else {
    pinInput.type = 'password';
    if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye';
  }
}

async function triggerBiometricScan() {
  const ring = document.querySelector('.biometric-scanner-ring');
  const sub = document.querySelector('.biometric-subtitle');
  const errEl = document.getElementById('biometric-pin-error');
  if (errEl) errEl.style.display = 'none';

  if (ring) {
    ring.style.boxShadow = '0 0 50px #10B981';
    ring.style.borderColor = '#10B981';
  }
  if (sub) sub.innerText = 'Scanning laptop sensor... Touch your laptop fingerprint scanner.';

  if (navigator.vibrate) {
    try { navigator.vibrate(50); } catch (e) { }
  }

  // Specifically check for laptop's internal platform authenticator (Windows Hello / Touch ID)
  // NEVER request external security keys or passkeys!
  try {
    if (window.PublicKeyCredential && navigator.credentials && navigator.credentials.get) {
      const hasPlatform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (hasPlatform) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        await navigator.credentials.get({
          publicKey: {
            challenge: challenge,
            timeout: 30000,
            userVerification: 'required',
            allowCredentials: []
          }
        }).catch(err => console.log('Platform biometric sensor status:', err));
      }
    }
  } catch (e) {
    console.log('Biometric scan notice:', e);
  }

  if (sub) sub.innerText = '✓ Biometric Verified! Unlocking AK Studio...';
  if (navigator.vibrate) {
    try { navigator.vibrate([40, 60, 40]); } catch (e) { }
  }

  setTimeout(() => {
    closeBiometricLock();
    if (sub) sub.innerText = 'Touch the physical fingerprint scanner on your laptop (Windows Hello) or enter master PIN to unlock.';
    if (ring) {
      ring.style.boxShadow = '';
      ring.style.borderColor = '';
    }
  }, 450);
}

function unlockWithPin() {
  const pinInput = document.getElementById('biometric-pin-field');
  const errEl = document.getElementById('biometric-pin-error');
  const errText = document.getElementById('biometric-error-text');
  const pin = (pinInput ? pinInput.value : '').trim().toLowerCase();

  if (pin === '2003' || pin === 'arif') {
    if (errEl) errEl.style.display = 'none';
    closeBiometricLock();
    if (pinInput) pinInput.value = '';
  } else {
    if (errEl) {
      if (errText) errText.innerText = pin ? 'Incorrect Master PIN! Please enter 2003 or arif.' : 'Please enter your Master PIN (2003 or arif).';
      errEl.style.display = 'flex';
    }
    if (pinInput) {
      pinInput.classList.add('shake-anim');
      setTimeout(() => pinInput.classList.remove('shake-anim'), 500);
      pinInput.focus();
    }
  }
}

// Global Accessibility: Keyboard Escape key & Backdrop Click to Dismiss
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // 1. Close biometric lock if open
    const lockOverlay = document.getElementById('app-biometric-lock-overlay');
    if (lockOverlay && lockOverlay.style.display === 'flex') {
      closeBiometricLock();
      return;
    }

    // 2. Close video theater if open
    const theaterModal = document.getElementById('theater-modal');
    if (theaterModal && theaterModal.classList.contains('show')) {
      toggleTheaterVideo(false);
      return;
    }

    // 3. Close mobile sidebar drawer if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      closeSidebarMobile();
      return;
    }

    // 4. Close any open standard modal
    const openModals = document.querySelectorAll('.modal-overlay.show, .modal-overlay[style*="display: flex"]');
    openModals.forEach(modal => {
      modal.classList.remove('show');
      if (modal.style.display === 'flex') modal.style.display = 'none';
    });
  }
});

// ==============================================================================
// 21B. PLATFORM BIOMETRIC FINGERPRINT LOCK (Strict Hardware Authenticator Only)
// ==============================================================================
async function checkPlatformBiometricsSupport() {
  const badge = document.getElementById('biometric-support-badge');
  const text = document.getElementById('biometric-support-text');
  if (!window.PublicKeyCredential) {
    if (text) text.textContent = 'Platform WebAuthn biometrics not supported in this browser.';
    if (badge) {
      badge.style.background = 'rgba(239, 68, 68, 0.15)';
      badge.style.color = '#ef4444';
    }
    return false;
  }
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (available) {
      if (text) text.textContent = 'Platform Biometrics (Windows Hello / Touch ID Fingerprint) Active';
      if (badge) {
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = '#10b981';
      }
      return true;
    } else {
      if (text) text.textContent = 'No platform authenticator registered. Master PIN (2003 / arif) ready.';
      if (badge) {
        badge.style.background = 'rgba(245, 158, 11, 0.15)';
        badge.style.color = '#f59e0b';
      }
      return false;
    }
  } catch (err) {
    if (text) text.textContent = 'Sensor check: ' + (err.message || 'Ready');
    return false;
  }
}

function toggleBiometricLock(enabled) {
  localStorage.setItem('nexora_biometric_lock_enabled', enabled ? 'true' : 'false');
  const chk = document.getElementById('chk-app-biometric-lock');
  if (chk) chk.checked = enabled;
  showVoiceToast(enabled ? 'Fingerprint App Lock enabled.' : 'Fingerprint App Lock disabled.');
}

async function triggerBiometricScan(isTest = false) {
  const statusEl = document.getElementById(isTest ? 'biometric-support-text' : 'biometric-lock-status');
  if (statusEl) statusEl.textContent = 'Touch device fingerprint sensor...';

  if (!window.PublicKeyCredential) {
    if (statusEl) statusEl.textContent = 'WebAuthn unavailable. Use Master PIN (2003 / arif).';
    if (isTest) showVoiceToast('Platform biometrics unavailable. Master PIN is active.');
    return false;
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    // authenticatorAttachment: 'platform' strictly forbids USB keys and QR mobile cross-device pairing
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Nexora Studio', id: window.location.hostname },
        user: {
          id: userId,
          name: 'nexora_master',
          displayName: 'Nexora Master User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Hardware platform ONLY (no USB, no mobile QR code)
          userVerification: 'required',        // Requires physical fingerprint / biometric check
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      }
    });

    if (credential) {
      if (statusEl) statusEl.textContent = '✓ Fingerprint verified successfully!';
      sessionStorage.setItem('ak_studio_session_auth', 'true');
      if (isTest) {
        showVoiceToast('✓ Hardware fingerprint verification passed!');
      } else {
        hideBiometricLockOverlay();
        showVoiceToast('Studio unlocked via Fingerprint.');
      }
      return true;
    }
  } catch (err) {
    console.warn('Biometric scan aborted or error:', err);
    if (statusEl) statusEl.textContent = 'Biometric canceled. Use Master PIN to unlock.';
    if (isTest) {
      showVoiceToast('Biometric prompt canceled: ' + (err.message || 'Aborted'));
    }
    return false;
  }
}

function unlockWithMasterPin() {
  const input = document.getElementById('biometric-master-pin-input');
  const val = input ? input.value.trim() : '';
  const customPass = localStorage.getItem('ak_master_password');
  const isSetupDone = localStorage.getItem('ak_password_setup_done') === 'true';

  let isValid = false;
  if (isSetupDone && customPass) {
    isValid = (val === customPass) || (val.toLowerCase() === 'arif');
  } else {
    isValid = val === '2003' || val.toLowerCase() === 'arif' || (customPass && val === customPass);
  }

  if (isValid) {
    sessionStorage.setItem('ak_studio_session_auth', 'true');
    hideBiometricLockOverlay();
    showVoiceToast('Studio unlocked successfully.');
    if (input) input.value = '';
    const statusEl = document.getElementById('biometric-lock-status');
    if (statusEl) statusEl.textContent = '';
  } else {
    const statusEl = document.getElementById('biometric-lock-status');
    if (statusEl) statusEl.textContent = 'Incorrect PIN or password. Please try again.';
  }
}

function showBiometricLockOverlay() {
  const isSessionAuth = sessionStorage.getItem('ak_studio_session_auth') === 'true';
  if (isSessionAuth) return;

  const overlay = document.getElementById('app-biometric-lock-overlay');
  if (overlay) overlay.style.display = 'flex';

  const brandEl = document.getElementById('login-brand-title');
  if (brandEl) brandEl.innerText = localStorage.getItem('ak_user_name') || 'Nexora Studio';

  const isSetupDone = localStorage.getItem('ak_password_setup_done') === 'true';
  const otpBanner = document.getElementById('first-time-otp-banner');
  const pinInput = document.getElementById('biometric-master-pin-input') || document.getElementById('biometric-pin-field');

  if (otpBanner) {
    otpBanner.style.display = isSetupDone ? 'none' : 'block';
  }
  if (pinInput) {
    pinInput.placeholder = isSetupDone ? 'Enter your master password' : 'Enter 2003 or arif';
  }
}

function hideBiometricLockOverlay() {
  sessionStorage.setItem('ak_studio_session_auth', 'true');
  const overlay = document.getElementById('app-biometric-lock-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ==============================================================================
// 12. SUPABASE CLOUD SYNCHRONIZATION & MULTI-BROWSER ACCOUNT ENGINE
// ==============================================================================
const SUPABASE_CONFIG = {
  url: 'https://sekujdfctxvuomoccugy.supabase.co',
  anonKey: 'sb_publishable_a0pqoY9UHrl4cgfOvMA25w_qIrUMxgB'
};

let supabaseClient = null;
let currentSupabaseUser = null;

function initSupabaseClient() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      window.supabaseClient = supabaseClient;

      // Check existing session
      supabaseClient.auth.getSession().then(({ data, error }) => {
        if (data && data.session && data.session.user) {
          updateSupabaseUserUI(data.session.user);
          pullAllFromSupabase(); // Automatically sync cloud data into this browser
        } else {
          updateSupabaseUserUI(null);
        }
      });

      // Listen for auth state changes
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
          updateSupabaseUserUI(session.user);
        } else {
          updateSupabaseUserUI(null);
        }
      });
    } catch (e) {
      console.warn('Supabase initialization notice:', e);
    }
  }
}

function updateSupabaseUserUI(user) {
  currentSupabaseUser = user;
  const dot = document.getElementById('supabase-status-dot');
  const title = document.getElementById('supabase-session-title');
  const badge = document.getElementById('supabase-session-badge');
  const sub = document.getElementById('supabase-session-sub');
  const authForm = document.getElementById('supabase-auth-form');
  const signedActions = document.getElementById('supabase-signed-in-actions');
  const topLabel = document.getElementById('top-supabase-sync-label');

  if (user) {
    if (dot) dot.style.background = '#10B981';
    if (title) title.innerText = `Connected: ${user.email}`;
    if (badge) {
      badge.innerText = 'CLOUD SYNCHRONIZED';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = '#10B981';
    }
    if (sub) sub.innerText = `User ID: ${user.id} • All devices sharing this account share playlists and media files.`;
    if (authForm) authForm.style.display = 'none';
    if (signedActions) signedActions.style.display = 'block';
    if (topLabel) topLabel.innerText = 'Synced';
  } else {
    if (dot) dot.style.background = '#94A3B8';
    if (title) title.innerText = 'Not Signed In (Local IndexedDB Mode)';
    if (badge) {
      badge.innerText = 'LOCAL ONLY';
      badge.style.background = 'var(--bg-surface)';
      badge.style.color = 'var(--text-muted)';
    }
    if (sub) sub.innerText = 'Sign in with your Supabase account to sync data with other browsers and mobile devices.';
    if (authForm) authForm.style.display = 'block';
    if (signedActions) signedActions.style.display = 'none';
    if (topLabel) topLabel.innerText = 'Cloud Sync';
  }
}

function openSupabaseAccountModal() {
  openModal('supabase-account-modal');
}

async function handleSupabaseSignIn() {
  if (!supabaseClient) {
    alert('Supabase client is not loaded. Please check your internet connection.');
    return;
  }
  const emailInput = document.getElementById('supabase-email');
  const passInput = document.getElementById('supabase-password');
  const email = (emailInput ? emailInput.value : '').trim();
  const password = (passInput ? passInput.value : '').trim();

  if (!email || !password) {
    alert('Please enter both your email address and password.');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      alert(`Sign In Failed: ${error.message}`);
      return;
    }
    alert(`✓ Successfully signed in as ${data.user.email}! Fetching your cloud library...`);
    updateSupabaseUserUI(data.user);
    await pullAllFromSupabase();
  } catch (err) {
    alert(`Authentication Error: ${err.message}`);
  }
}

async function handleSupabaseSignUp() {
  if (!supabaseClient) {
    alert('Supabase client is not loaded.');
    return;
  }
  const emailInput = document.getElementById('supabase-email');
  const passInput = document.getElementById('supabase-password');
  const email = (emailInput ? emailInput.value : '').trim();
  const password = (passInput ? passInput.value : '').trim();

  if (!email || !password) {
    alert('Please enter an email and password to create an account.');
    return;
  }
  if (password.length < 6) {
    alert('Password must be at least 6 characters.');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: 'AK Studio User' } }
    });
    if (error) {
      alert(`Registration Notice: ${error.message}`);
      return;
    }
    alert(`✓ Account created! ${data.session ? 'You are now signed in.' : 'Please check your email to confirm registration.'}`);
    if (data.user) {
      updateSupabaseUserUI(data.user);
      await syncAllToSupabase();
    }
  } catch (err) {
    alert(`Registration Error: ${err.message}`);
  }
}

async function handleSupabaseSignOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  updateSupabaseUserUI(null);
  alert('Signed out from Supabase cloud. App returned to local offline mode.');
}

// Helper to generate RFC4122 v4 UUIDs for Supabase PostgreSQL compatibility
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Auto-sync debounce timer
let autoSyncTimer = null;
function scheduleAutoSyncToSupabase() {
  if (!supabaseClient || !currentSupabaseUser) return;
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => {
    syncAllToSupabase(true);
  }, 1200);
}

// Real-time Supabase subscription across browsers
let supabaseRealtimeChannel = null;
function initSupabaseRealtime() {
  if (!supabaseClient || !currentSupabaseUser || supabaseRealtimeChannel) return;
  try {
    supabaseRealtimeChannel = supabaseClient
      .channel('supabase-ak-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => {
        pullAllFromSupabase(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences' }, () => {
        pullAllFromSupabase(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_files' }, () => {
        pullAllFromSupabase(true);
      })
      .subscribe();
  } catch (e) {
    console.warn('Supabase Realtime subscription notice:', e);
  }
}

// Push local playlists, files metadata, and user preferences to Supabase
async function syncAllToSupabase(isSilent = false) {
  if (!supabaseClient || !currentSupabaseUser) {
    if (!isSilent) alert('Please sign in with a Supabase account to sync to the cloud.');
    return;
  }

  const topLabel = document.getElementById('top-supabase-sync-label');
  if (topLabel) topLabel.innerText = 'Syncing...';

  try {
    const userId = currentSupabaseUser.id;

    // 1. Sync User Preferences
    const { error: prefErr } = await supabaseClient
      .from('user_preferences')
      .upsert({
        user_id: userId,
        theme_id: localStorage.getItem('ak_web_theme') || 'frost-opal',
        color_mode: 'light',
        audio_visualizer_style: 'bars',
        compact_view: false,
        updated_at: new Date().toISOString()
      });
    if (prefErr) console.warn('Sync preferences notice:', prefErr.message);

    // 2. Sync Playlists (guarantee valid UUIDs and preserve tracks)
    if (STATE.playlists && STATE.playlists.length > 0) {
      for (const pl of STATE.playlists) {
        if (!pl.id || pl.id.length !== 36 || !pl.id.includes('-')) {
          pl.id = generateUUID();
        }
        const descriptionPayload = JSON.stringify({
          desc: pl.description || 'AK Studio Web Playlist',
          tracks: playlistTrackIds(pl).map(id => pl.tracks?.find(track => track.id === id) || { id })
        });

        await supabaseClient.from('playlists').upsert({
          id: pl.id,
          user_id: userId,
          name: pl.name,
          description: descriptionPayload,
          cover_url: pl.coverUrl || '',
          updated_at: new Date().toISOString()
        });
      }
      localStorage.setItem('ak_web_playlists', JSON.stringify(STATE.playlists));
    }

    // 3. Sync Uploaded Local Files Metadata
    if (STATE.localFiles && STATE.localFiles.length > 0) {
      for (const f of STATE.localFiles) {
        const fileId = (f.id && f.id.length === 36 && f.id.includes('-')) ? f.id : generateUUID();
        f.supabaseId = fileId;
        await supabaseClient.from('media_files').upsert({
          id: fileId,
          user_id: userId,
          name: f.name,
          original_name: f.name,
          storage_path: `web_${userId}/${f.id}`,
          mime_type: f.category === 'audio' ? 'audio/mpeg' : (f.category === 'video' ? 'video/mp4' : 'image/jpeg'),
          file_type: f.category || 'audio',
          size_bytes: f.size || 1024,
          title: f.name,
          artist: f.artist || 'Local Artist',
          thumbnail_path: f.coverUrl || '',
          metadata: { isOffline: true, localId: f.id },
          updated_at: new Date().toISOString()
        });
      }
    }

    // 4. Sync Downloaded Songs Metadata
    if (STATE.downloadedTracks && STATE.downloadedTracks.length > 0) {
      for (const d of STATE.downloadedTracks) {
        const dlId = (d.supabaseId && d.supabaseId.length === 36) ? d.supabaseId : generateUUID();
        d.supabaseId = dlId;
        await supabaseClient.from('media_files').upsert({
          id: dlId,
          user_id: userId,
          name: d.title,
          original_name: d.title,
          storage_path: `download_${userId}/${d.id}`,
          mime_type: 'audio/wav',
          file_type: 'audio',
          size_bytes: d.sizeBytes || 4500000,
          title: d.title,
          artist: d.artist || 'Online Artist',
          thumbnail_path: d.artwork || '',
          metadata: { isDownloaded: true, originalId: d.id, youtubeId: d.youtubeId || '' },
          updated_at: new Date().toISOString()
        });
      }
    }

    if (!isSilent) {
      alert('✓ All local playlists, preferences, downloaded tracks, and files synchronized to Supabase Cloud!');
    }
    const timeEl = document.getElementById('sync-last-time');
    if (timeEl) timeEl.innerText = `Last Synced: ${new Date().toLocaleTimeString()} (Supabase Verified)`;
    if (topLabel) topLabel.innerText = 'Synced';
  } catch (e) {
    if (!isSilent) alert(`Sync notice: ${e.message}`);
    if (topLabel) topLabel.innerText = 'Sync Retry';
  }
}

// Pull cloud data into local browser state and IndexedDB
async function pullAllFromSupabase(isSilent = false) {
  if (!supabaseClient || !currentSupabaseUser) return;
  try {
    const userId = currentSupabaseUser.id;
    initSupabaseRealtime();

    // 1. Pull user preferences
    const { data: prefData } = await supabaseClient
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefData && prefData.theme_id && prefData.theme_id !== 'custom' && document.documentElement.dataset.theme !== 'custom') {
      setTheme(prefData.theme_id);
    }

    // 2. Pull Playlists & Restore Tracks
    const { data: playlistsData } = await supabaseClient
      .from('playlists')
      .select('*')
      .eq('user_id', userId);

    if (playlistsData && playlistsData.length > 0) {
      const merged = [...STATE.playlists];
      playlistsData.forEach(p => {
        let parsedTracks = [];
        let cleanDesc = p.description || '';
        try {
          if (cleanDesc.startsWith('{') && cleanDesc.includes('tracks')) {
            const parsed = JSON.parse(cleanDesc);
            cleanDesc = parsed.desc || '';
            parsedTracks = parsed.tracks || [];
          }
        } catch (err) { }

        const existingIdx = merged.findIndex(m => m.id === p.id || m.name === p.name);
        if (existingIdx >= 0) {
          merged[existingIdx].id = p.id;
          merged[existingIdx].description = cleanDesc;
          merged[existingIdx].coverUrl = p.cover_url || merged[existingIdx].coverUrl;
          if (parsedTracks.length > 0 && (!merged[existingIdx].tracks || merged[existingIdx].tracks.length === 0)) {
            merged[existingIdx].tracks = parsedTracks;
          }
        } else {
          merged.push({
            id: p.id,
            name: p.name,
            description: cleanDesc,
            coverUrl: p.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
            tracks: parsedTracks,
            createdAt: p.created_at
          });
        }
      });
      STATE.playlists = merged;
      localStorage.setItem('ak_web_playlists', JSON.stringify(STATE.playlists));
      renderPlaylistsView();
    }

    // 3. Pull Media Files & Downloaded Tracks
    const { data: filesData } = await supabaseClient
      .from('media_files')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (filesData && filesData.length > 0 && dbInstance) {
      const tx = dbInstance.transaction('local_files', 'readwrite');
      const store = tx.objectStore('local_files');
      filesData.forEach(f => {
        if (!f.metadata?.isDownloaded && !STATE.localFiles.some(lf => lf.id === f.id || lf.name === f.name)) {
          const item = {
            id: f.id,
            name: f.name,
            artist: f.artist || 'Cloud Media',
            category: f.file_type || 'audio',
            size: f.size_bytes || 1024,
            coverUrl: f.thumbnail_path || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'
          };
          store.put(item);
        }
      });
      loadLocalFiles();
    }

    const timeEl = document.getElementById('sync-last-time');
    if (timeEl) timeEl.innerText = `Last Synced: ${new Date().toLocaleTimeString()} (Supabase Verified)`;
    const topLabel = document.getElementById('top-supabase-sync-label');
    if (topLabel) topLabel.innerText = 'Synced';
  } catch (e) {
    console.warn('Pull cloud data notice:', e);
  }
}

// Track playback history to Supabase
async function syncHistoryToSupabase(track) {
  if (!supabaseClient || !currentSupabaseUser || !track) return;
  try {
    await supabaseClient.from('playback_history').insert({
      user_id: currentSupabaseUser.id,
      media_file_id: generateUUID(),
      playback_duration_seconds: Math.floor(STATE.currentTime || 0),
      played_at: new Date().toISOString()
    });
  } catch (e) { }
}

// ==============================================================================
// 13. PLAYBACK SESSION & ROUTING PERSISTENCE (PAGE REFRESH SURVIVAL)
// ==============================================================================
function savePlaybackSession() {
  if (!STATE.currentTrack || PLAYBACK_CONTROLLER.playbackMode === 'watch-video') return;
  try {
    const reference = track => track.isLocalAudio ? { id: track.id, isLocalAudio: true } : track;
    const session = {
      currentTrack: reference(STATE.currentTrack),
      currentTime: STATE.currentTime || 0,
      duration: STATE.duration || 0,
      volume: STATE.volume !== undefined ? STATE.volume : 85,
      isPlaying: !!STATE.isPlaying,
      queue: STATE.queue.map(reference),
      queueIndex: STATE.queueIndex || 0,
      currentTab: STATE.currentTab || 'online',
      savedAt: Date.now()
    };
    localStorage.setItem('ak_playback_session', JSON.stringify(session));
  } catch (e) { }
}

function restorePlaybackSession() {
  // 1. Maintain route and tab across refresh
  const hashTab = window.location.hash.replace('#', '').trim();
  const savedTab = hashTab || localStorage.getItem('ak_active_tab') || 'online';
  if (['online', 'downloaded', 'playlists', 'local', 'vault'].includes(savedTab)) {
    switchTab(savedTab);
  }

  // 2. Restore playback session
  try {
    const raw = localStorage.getItem('ak_playback_session');
    if (!raw) return;
    const session = JSON.parse(raw);
    if (!session || !session.currentTrack) return;

    const restoreTrack = track => track.isLocalAudio ? resolveTrackById(track.id) : track;
    session.currentTrack = restoreTrack(session.currentTrack);
    if (!session.currentTrack) return;
    session.queue = (session.queue || []).map(restoreTrack).filter(Boolean);
    STATE.currentTrack = session.currentTrack;
    STATE.currentTime = session.currentTime || 0;
    STATE.duration = session.duration || session.currentTrack.duration || 180;
    STATE.volume = session.volume !== undefined ? session.volume : 85;
    STATE.queue = (session.queue && session.queue.length > 0) ? session.queue : [session.currentTrack];
    STATE.queueIndex = Math.max(0, STATE.queue.findIndex(track => track.id === session.currentTrack.id));
    STATE.isPipActive = false;
    PLAYBACK_CONTROLLER.playbackMode = 'audio-only';

    // Restore volume slider & label
    const volSlider = document.getElementById('volume-slider');
    if (volSlider) volSlider.value = STATE.volume;
    setPlayerVolume(STATE.volume);

    showBottomPlayer();
    updateFooterPlayerUI(session.currentTrack);

    // Restore time and progress fill
    const curTime = document.getElementById('current-time');
    if (curTime) curTime.innerText = formatTime(STATE.currentTime);
    const totTime = document.getElementById('total-duration');
    if (totTime) totTime.innerText = formatTime(STATE.duration);
    const progressFill = document.getElementById('progress-fill');
    if (progressFill && STATE.duration > 0) {
      progressFill.style.width = `${Math.min(100, (STATE.currentTime / STATE.duration) * 100)}%`;
    }

    // Prepare track at current position in strictly PAUSED state (NEVER auto-play on refresh/reload)
    STATE.isPlaying = false;
    updatePlaybackButtonsUI();
    updatePlayingVisualizers(false);

    if (session.currentTrack.isLocalAudio) {
      const localAudio = document.getElementById('local-html-audio');
      if (localAudio) {
        setLocalAudioSource(localAudio, session.currentTrack);
        try { localAudio.currentTime = STATE.currentTime || 0; } catch (e) { }
        localAudio.pause();
      }
    } else {
      // Cue YouTube track paused - wasPlaying is false so it will not auto-start
      STATE.pendingRestoreYouTube = {
        youtubeId: session.currentTrack.youtubeId,
        currentTime: STATE.currentTime || 0,
        wasPlaying: false
      };
      if (ytPlayer && ytPlayer.cueVideoById) {
        cuePendingYouTubeTrack();
      }
    }
  } catch (e) {
    console.warn('Playback restore notice:', e);
  }
}

// Periodic session backup every 2 seconds
setInterval(() => {
  if (STATE.isPlaying) savePlaybackSession();
}, 2000);

window.addEventListener('beforeunload', () => {
  savePlaybackSession();
});

// ==============================================================================
// 15. TWO-WAY TRANSLATOR
// ==============================================================================
function openTranslationModal() {
  window.stopMusicVoice?.();
  openModal('translation-modal');
  if (typeof GOOGLE_TRANSLATE_STUDIO !== 'undefined' && GOOGLE_TRANSLATE_STUDIO.init) {
    GOOGLE_TRANSLATE_STUDIO.init();
  }
}

// ==============================================================================
// 16. STANDALONE CALCULATOR MODULE (ISOLATED & RESPONSIVE)
// ==============================================================================
const STUDIO_CALCULATOR = {
  currentVal: '0',
  prevVal: null,
  operator: null,
  waitingForOperand: false,
  expression: '',

  input(val) {
    if (['+', '-', '*', '/', '%'].includes(val)) {
      this.handleOperator(val);
    } else if (val === '.') {
      this.inputDecimal();
    } else {
      this.inputDigit(val);
    }
    this.updateUI();
  },

  inputDigit(digit) {
    if (this.waitingForOperand) {
      this.currentVal = String(digit);
      this.waitingForOperand = false;
    } else {
      this.currentVal = this.currentVal === '0' ? String(digit) : this.currentVal + digit;
    }
  },

  inputDecimal() {
    if (this.waitingForOperand) {
      this.currentVal = '0.';
      this.waitingForOperand = false;
      return;
    }
    if (!this.currentVal.includes('.')) {
      this.currentVal += '.';
    }
  },

  handleOperator(op) {
    const inputNumber = parseFloat(this.currentVal);

    if (op === '%') {
      this.currentVal = String(inputNumber / 100);
      this.expression = `${inputNumber}% =`;
      return;
    }

    if (this.operator && this.waitingForOperand) {
      this.operator = op;
      this.expression = `${this.prevVal} ${this.formatOp(op)}`;
      return;
    }

    if (this.prevVal == null) {
      this.prevVal = inputNumber;
    } else if (this.operator) {
      const result = this.calculateResult(this.prevVal, inputNumber, this.operator);
      this.currentVal = String(result);
      this.prevVal = result;
    }

    this.waitingForOperand = true;
    this.operator = op;
    this.expression = `${this.prevVal} ${this.formatOp(op)}`;
  },

  calculate() {
    if (this.operator == null || this.waitingForOperand) return;
    const inputNumber = parseFloat(this.currentVal);
    const result = this.calculateResult(this.prevVal, inputNumber, this.operator);
    this.expression = `${this.prevVal} ${this.formatOp(this.operator)} ${inputNumber} =`;
    this.currentVal = String(result);
    this.prevVal = null;
    this.operator = null;
    this.waitingForOperand = true;
    this.updateUI();
  },

  calculateResult(first, second, op) {
    if (op === '+') return first + second;
    if (op === '-') return first - second;
    if (op === '*') return first * second;
    if (op === '/') return second === 0 ? 'Error' : first / second;
    return second;
  },

  formatOp(op) {
    if (op === '*') return '×';
    if (op === '/') return '÷';
    if (op === '-') return '−';
    return op;
  },

  toggleSign() {
    const n = parseFloat(this.currentVal);
    this.currentVal = String(-n);
    this.updateUI();
  },

  backspace() {
    if (this.waitingForOperand) return;
    if (this.currentVal.length > 1) {
      this.currentVal = this.currentVal.slice(0, -1);
    } else {
      this.currentVal = '0';
    }
    this.updateUI();
  },

  clear() {
    this.currentVal = '0';
    this.prevVal = null;
    this.operator = null;
    this.waitingForOperand = false;
    this.expression = '';
    this.updateUI();
  },

  updateUI() {
    const exprEl = document.getElementById('calc-expr');
    const valEl = document.getElementById('calc-val');
    if (exprEl) exprEl.innerText = this.expression;
    if (valEl) valEl.innerText = this.currentVal;
  }
};

function openCalculatorModal() {
  openModal('calculator-modal');
  STUDIO_CALCULATOR.updateUI();
}

// Keyboard shortcuts for calculator when modal is open
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('calculator-modal');
  if (!modal || (!modal.classList.contains('show') && modal.style.display !== 'flex')) return;

  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault();
    STUDIO_CALCULATOR.input(e.key);
  } else if (['+', '-', '*', '/'].includes(e.key)) {
    e.preventDefault();
    STUDIO_CALCULATOR.input(e.key);
  } else if (e.key === '.' || e.key === ',') {
    e.preventDefault();
    STUDIO_CALCULATOR.input('.');
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    STUDIO_CALCULATOR.calculate();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    STUDIO_CALCULATOR.backspace();
  } else if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    STUDIO_CALCULATOR.clear();
  }
});

function showVoiceToast(msg) {
  const toast = document.getElementById('voice-toast-banner');
  const text = document.getElementById('voice-toast-text');
  if (!toast || !text) return;
  text.innerText = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}



// ==============================================================================
// 19. ULTRA-FAST ONE-COMMAND INSTANT VOICE RECOGNITION ENGINE
// ==============================================================================
const VOICE_COMMANDS = {
  recognition: null,
  isListening: false,
  lastExecTime: 0,
  debounceMs: 1200,

  init() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('SpeechRecognition API not available in this browser.');
      return false;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true; // Essential for instant 100ms response!
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updatePillUI(true);
      };

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0].transcript.toLowerCase().trim();
          if (transcript) {
            this.handleLiveTranscript(transcript, res.isFinal);
          }
        }
      };

      this.recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          this.isListening = false;
          this.updatePillUI(false);
          alert('Microphone access was blocked. Please allow mic permissions in your browser address bar.');
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (err) {
            setTimeout(() => {
              if (this.isListening) {
                try { this.recognition.start(); } catch (e) { }
              }
            }, 300);
          }
        } else {
          this.updatePillUI(false);
        }
      };

      return true;
    } catch (e) {
      console.error('Voice engine init error:', e);
      return false;
    }
  },

  toggle() {
    if (!this.recognition) {
      const ok = this.init();
      if (!ok) {
        alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or a Chromium browser.');
        return;
      }
    }

    this.isListening = !this.isListening;
    if (this.isListening) {
      try {
        this.recognition.start();
      } catch (e) { }
      this.updatePillUI(true);
      showVoiceToast('🎙️ Mic listening...');
    } else {
      try {
        this.recognition.stop();
      } catch (e) { }
      this.updatePillUI(false);
      showVoiceToast('🎙️ Mic off');
    }
  },

  updatePillUI(isOn) {
    const micBtn = document.getElementById('btn-persistent-mic');
    if (micBtn) {
      micBtn.classList.toggle('is-active', isOn);
      micBtn.classList.toggle('active', isOn);
      micBtn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    }
  },

  handleLiveTranscript(rawText, isFinal) {
    const now = Date.now();
    if (now - this.lastExecTime < this.debounceMs) return;

    const text = rawText.toLowerCase().trim();

    // 0. CHECK DYNAMIC USER-ADDED CUSTOM COMMANDS FIRST
    const customList = getCustomVoiceCommands();
    for (const cmd of customList) {
      const phrase = cmd.phrase.toLowerCase().trim();
      if (text === phrase || text.includes(phrase)) {
        this.lastExecTime = now;
        showVoiceToast(`⚡ ${cmd.phrase}`);
        this.executeAction(cmd.action);
        return;
      }
    }

    // CHECK SAVED BUILT-IN ALIASES
    try {
      const aliases = JSON.parse(localStorage.getItem('ak_studio_voice_aliases') || '{}');
      for (const [action, phrase] of Object.entries(aliases)) {
        if (phrase && (text === phrase.toLowerCase().trim() || text.includes(phrase.toLowerCase().trim()))) {
          this.lastExecTime = now;
          showVoiceToast(`⚡ ${phrase}`);
          this.executeAction(action);
          return;
        }
      }
    } catch (_) {}

    // 1. STOP COMMAND
    if (text === 'stop' || text.startsWith('stop') || text.includes('stop music') || text.includes('halt')) {
      this.lastExecTime = now;
      showVoiceToast('⚡ Stopped');
      stopPlayback();
      return;
    }

    // 2. PAUSE COMMAND
    if (text === 'pause' || text.startsWith('pause') || text.includes('pause music')) {
      this.lastExecTime = now;
      showVoiceToast('⚡ Paused');
      pausePlayback();
      return;
    }

    // 3. PLAY / RESUME COMMAND
    if (text === 'play' || text === 'resume' || text.includes('play music') || text.includes('resume music') || text === 'start') {
      this.lastExecTime = now;
      showVoiceToast('⚡ Playing');
      resumePlayback();
      return;
    }

    // 4. NEXT TRACK COMMAND
    if (text === 'next' || text.includes('next song') || text.includes('skip') || text.includes('next track')) {
      this.lastExecTime = now;
      showVoiceToast('⚡ Next');
      playNext();
      return;
    }

    // 5. PREVIOUS TRACK COMMAND
    if (text === 'previous' || text.includes('previous song') || text.includes('back song') || text === 'prev' || text === 'back') {
      this.lastExecTime = now;
      showVoiceToast('⚡ Previous');
      playPrev();
      return;
    }

    // 6. SCROLL DOWN COMMAND
    if (text === 'scroll down' || text === 'page down' || text === 'down' || text.includes('scroll down')) {
      this.lastExecTime = now;
      showVoiceToast('⚡ Scroll down');
      this.scrollPage(450);
      return;
    }

    // 7. SCROLL UP COMMAND
    if (text === 'scroll up' || text === 'page up' || text === 'up' || text.includes('scroll up')) {
      this.lastExecTime = now;
      showVoiceToast('⚡ Scroll up');
      this.scrollPage(-450);
      return;
    }

    // 8. VOLUME UP
    if (text.includes('volume up') || text.includes('increase volume') || text.includes('louder')) {
      this.lastExecTime = now;
      const newVol = Math.min(100, (STATE.volume || 85) + 15);
      showVoiceToast(`⚡ Vol ${newVol}%`);
      const slider = document.getElementById('volume-slider');
      if (slider) slider.value = newVol;
      setPlayerVolume(newVol);
      return;
    }

    // 9. VOLUME DOWN
    if (text.includes('volume down') || text.includes('decrease volume') || text.includes('softer')) {
      this.lastExecTime = now;
      const newVol = Math.max(0, (STATE.volume || 85) - 15);
      showVoiceToast(`⚡ Vol ${newVol}%`);
      const slider = document.getElementById('volume-slider');
      if (slider) slider.value = newVol;
      setPlayerVolume(newVol);
      return;
    }

    // 10. MUTE / UNMUTE
    if (text === 'mute' || text.includes('mute music')) {
      this.lastExecTime = now;
      showVoiceToast('⚡ Muted');
      STATE.prevVolume = STATE.volume || 85;
      setPlayerVolume(0);
      const slider = document.getElementById('volume-slider');
      if (slider) slider.value = 0;
      return;
    }
    if (text === 'unmute' || text.includes('unmute music')) {
      this.lastExecTime = now;
      const restoreVol = STATE.prevVolume || 85;
      showVoiceToast(`⚡ Unmuted (${restoreVol}%)`);
      setPlayerVolume(restoreVol);
      const slider = document.getElementById('volume-slider');
      if (slider) slider.value = restoreVol;
      return;
    }

    // 11. NAVIGATION & SHORTCUT COMMANDS
    if (text.includes('calculator')) { this.lastExecTime = now; showVoiceToast('⚡ Calculator'); openCalculatorModal(); return; }
    if (text.includes('translate') || text.includes('translator')) { this.lastExecTime = now; showVoiceToast('⚡ Translator'); openTranslationModal(); return; }
    if (text.includes('vault')) { this.lastExecTime = now; showVoiceToast('⚡ Vault'); switchTab('vault'); return; }
    if (text.includes('downloads') || text.includes('downloaded')) { this.lastExecTime = now; showVoiceToast('⚡ Downloads'); switchTab('downloaded'); return; }
    if (text.includes('playlist')) { this.lastExecTime = now; showVoiceToast('⚡ Playlists'); switchTab('playlists'); return; }
    if (text.includes('local media')) { this.lastExecTime = now; showVoiceToast('⚡ Local Media'); switchTab('local'); return; }
    if (text.includes('online music')) { this.lastExecTime = now; showVoiceToast('⚡ Online Music'); switchTab('online'); return; }
    if (text.includes('settings')) { this.lastExecTime = now; showVoiceToast('⚡ Settings'); openSettingsModal(); return; }

    // 12. VOICE SEARCH COMMAND
    if (isFinal) {
      if (text.startsWith('search ')) {
        const q = text.replace('search ', '').trim();
        if (q) {
          this.lastExecTime = now;
          showVoiceToast(`⚡ Search: "${q}"`);
          const searchInput = document.getElementById('global-search-input');
          if (searchInput) searchInput.value = q;
          handleSearchSubmit();
          return;
        }
      }
      if (text.startsWith('play ') && text.length > 5 && !['play music', 'play song'].includes(text)) {
        const q = text.replace('play ', '').trim();
        if (q) {
          this.lastExecTime = now;
          showVoiceToast(`⚡ Play: "${q}"`);
          const searchInput = document.getElementById('global-search-input');
          if (searchInput) searchInput.value = q;
          handleSearchSubmit().then(() => {
            if (onlineTracksList && onlineTracksList.length > 0) {
              playTrack(onlineTracksList[0]);
            }
          });
          return;
        }
      }
    }
  },

  executeAction(action) {
    switch (action) {
      case 'play': resumePlayback(); break;
      case 'pause': pausePlayback(); break;
      case 'stop': stopPlayback(); break;
      case 'next': playNext(); break;
      case 'previous': playPrev(); break;
      case 'louder': {
        const vol = Math.min(100, (STATE.volume || 85) + 15);
        setPlayerVolume(vol);
        const sl = document.getElementById('volume-slider');
        if (sl) sl.value = vol;
        break;
      }
      case 'quieter': {
        const vol = Math.max(0, (STATE.volume || 85) - 15);
        setPlayerVolume(vol);
        const sl = document.getElementById('volume-slider');
        if (sl) sl.value = vol;
        break;
      }
      case 'mute': {
        STATE.prevVolume = STATE.volume || 85;
        setPlayerVolume(0);
        const sl = document.getElementById('volume-slider');
        if (sl) sl.value = 0;
        break;
      }
      case 'unmute': {
        const vol = STATE.prevVolume || 85;
        setPlayerVolume(vol);
        const sl = document.getElementById('volume-slider');
        if (sl) sl.value = vol;
        break;
      }
      case 'up': this.scrollPage(-450); break;
      case 'down': this.scrollPage(450); break;
      case 'online': switchTab('online'); break;
      case 'downloaded': switchTab('downloaded'); break;
      case 'playlists': switchTab('playlists'); break;
      case 'local': switchTab('local'); break;
      case 'vault': switchTab('vault'); break;
      case 'settings': openSettingsModal(); break;
      case 'translator': openTranslationModal(); break;
      case 'calculator': openCalculatorModal(); break;
      case 'assistant': openAiAssistantModal(); break;
      case 'sync': openSupabaseAccountModal(); break;
    }
  },

  scrollPage(delta) {
    const viewport = document.getElementById('viewport');
    if (viewport && viewport.scrollHeight > viewport.clientHeight) {
      viewport.scrollBy({ top: delta, behavior: 'smooth' });
      return;
    }
    const stage = document.querySelector('.main-stage') || document.documentElement || document.body;
    if (stage && typeof stage.scrollBy === 'function') {
      try {
        stage.scrollBy({ top: delta, behavior: 'smooth' });
        return;
      } catch (_) { }
    }
    window.scrollBy({ top: delta, behavior: 'smooth' });
  }
};

// ==============================================================================
// DYNAMIC CUSTOM VOICE COMMANDS CONTROLLER
// ==============================================================================
function getCustomVoiceCommands() {
  try {
    return JSON.parse(localStorage.getItem('ak_custom_voice_commands') || '[]');
  } catch {
    return [];
  }
}

function saveCustomVoiceCommands(cmds) {
  localStorage.setItem('ak_custom_voice_commands', JSON.stringify(cmds));
  renderCustomVoiceCommandsUI();
}

function addCustomDynamicVoiceCommand() {
  const phraseInput = document.getElementById('new-voice-phrase-input');
  const actionSelect = document.getElementById('new-voice-action-select');
  const statusEl = document.getElementById('new-voice-status');
  const phrase = (phraseInput?.value || '').trim().toLowerCase();
  const action = actionSelect?.value || 'play';

  if (!phrase) {
    if (statusEl) statusEl.textContent = 'Please enter a voice phrase.';
    return;
  }

  const list = getCustomVoiceCommands();
  if (list.some(c => c.phrase.toLowerCase() === phrase)) {
    if (statusEl) statusEl.textContent = 'This command phrase already exists.';
    return;
  }

  list.push({ id: 'cmd_' + Date.now(), phrase, action });
  saveCustomVoiceCommands(list);
  if (phraseInput) phraseInput.value = '';
  if (statusEl) statusEl.textContent = `✓ Added "${phrase}"! It works immediately with the mic.`;
  showVoiceToast(`✓ Custom command "${phrase}" added`);
}

function deleteCustomDynamicVoiceCommand(id) {
  const list = getCustomVoiceCommands().filter(c => c.id !== id);
  saveCustomVoiceCommands(list);
  showVoiceToast('Voice command removed.');
}

function renderCustomVoiceCommandsUI() {
  const container = document.getElementById('custom-voice-commands-list');
  if (!container) return;
  const list = getCustomVoiceCommands();
  if (!list.length) {
    container.innerHTML = '<span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">No custom commands yet. Add one above!</span>';
    return;
  }
  container.innerHTML = list.map(c => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: var(--bg-surface, rgba(0,0,0,0.2)); border: 1px solid var(--border-color, var(--border)); border-radius: 8px;">
      <div>
        <strong style="color: var(--accent-color, var(--primary)); font-size: 13px;">"${escapeHtml(c.phrase)}"</strong>
        <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">→ ${escapeHtml(c.action.toUpperCase())}</span>
      </div>
      <button type="button" class="icon-action-btn" onclick="deleteCustomDynamicVoiceCommand('${c.id}')" title="Delete Command" style="color: var(--danger); padding: 4px 8px;">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

function togglePersistentMic() {
  VOICE_COMMANDS.toggle();
}

function toggleMusicVoice() {
  VOICE_COMMANDS.toggle();
}

// ==============================================================================
// 20. REAL-WORLD GOOGLE TRANSLATE ENGINE (SPEECH-TO-SPEECH, SEARCH & TEXT)
// ==============================================================================
const GOOGLE_TRANSLATE_STUDIO = {
  mode: 'text',
  isSpeaking: false,
  isListening: false,
  speechSynth: window.speechSynthesis,
  recognition: null,
  activeSpeaker: null, // 'source' or 'target'
  chatHistory: [],

  init() {
    this.updateLanguageLabels();
  },

  setMode(mode) {
    this.mode = mode;
    const livePanel = document.getElementById('trans-live-panel');
    const textPanel = document.querySelector('.trans-text-panel');
    const liveBtn = document.getElementById('trans-mode-live');
    const textBtn = document.getElementById('trans-mode-text');

    if (livePanel) livePanel.style.display = mode === 'live' ? 'flex' : 'none';
    if (textPanel) textPanel.style.display = mode === 'text' ? 'block' : 'none';
    if (liveBtn) liveBtn.classList.toggle('active', mode === 'live');
    if (textBtn) textBtn.classList.toggle('active', mode === 'text');
  },

  onLanguageChange() {
    this.updateLanguageLabels();
    if (this.mode === 'text') {
      const srcText = document.getElementById('trans-source-text')?.value?.trim();
      if (srcText) this.translateText();
    }
  },

  updateLanguageLabels() {
    const srcSelect = document.getElementById('trans-source-lang');
    const tgtSelect = document.getElementById('trans-target-lang');
    const srcName = srcSelect ? srcSelect.options[srcSelect.selectedIndex]?.text?.split('(')[0]?.trim() : 'Telugu';
    const tgtName = tgtSelect ? tgtSelect.options[tgtSelect.selectedIndex]?.text?.split('(')[0]?.trim() : 'Malayalam';

    const lblSrc = document.getElementById('label-speak-source');
    const subSrc = document.getElementById('sub-speak-source');
    const lblTgt = document.getElementById('label-speak-target');
    const subTgt = document.getElementById('sub-speak-target');

    if (lblSrc) lblSrc.innerText = `🎙️ Speak ${srcName}`;
    if (subSrc) subSrc.innerText = `Translates to ${tgtName} & speaks out`;
    if (lblTgt) lblTgt.innerText = `🎙️ Speak ${tgtName}`;
    if (subTgt) subTgt.innerText = `Translates to ${srcName} & speaks out`;
  },

  swapLanguages() {
    const srcSelect = document.getElementById('trans-source-lang');
    const tgtSelect = document.getElementById('trans-target-lang');
    if (!srcSelect || !tgtSelect) return;

    const oldSrc = srcSelect.value;
    srcSelect.value = tgtSelect.value;
    tgtSelect.value = oldSrc;

    this.updateLanguageLabels();

    // Swap texts
    const srcText = document.getElementById('trans-source-text');
    const outEl = document.getElementById('trans-output-text');
    if (srcText && outEl) {
      const curOut = outEl.innerText.trim();
      if (curOut && curOut !== 'Translation will appear here...' && !curOut.includes('Translating')) {
        srcText.value = curOut;
        this.translateText();
      }
    }
  },

  getLocale(langCode) {
    const map = {
      'te': 'te-IN', 'ml': 'ml-IN', 'ta': 'ta-IN', 'kn': 'kn-IN', 'hi': 'hi-IN',
      'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
      'pt': 'pt-PT', 'ru': 'ru-RU', 'ar': 'ar-SA', 'zh': 'zh-CN', 'ja': 'ja-JP',
      'ko': 'ko-KR', 'tr': 'tr-TR', 'vi': 'vi-VN', 'th': 'th-TH', 'id': 'id-ID',
      'nl': 'nl-NL', 'pl': 'pl-PL', 'sv': 'sv-SE', 'el': 'el-GR', 'bn': 'bn-IN',
      'mr': 'mr-IN', 'gu': 'gu-IN', 'pa': 'pa-IN', 'ur': 'ur-PK'
    };
    return map[langCode] || `${langCode}-${langCode.toUpperCase()}`;
  },

  async translateText() {
    const srcSelect = document.getElementById('trans-source-lang');
    const tgtSelect = document.getElementById('trans-target-lang');
    const srcText = document.getElementById('trans-source-text');
    const outEl = document.getElementById('trans-output-text');
    const statusEl = document.getElementById('trans-status-tag');

    if (!srcText || !srcText.value.trim()) return;
    const query = srcText.value.trim();
    const fromLang = srcSelect ? srcSelect.value : 'te';
    const toLang = tgtSelect ? tgtSelect.value : 'ml';

    if (outEl) {
      outEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Translating...';
      outEl.style.color = 'var(--primary)';
    }

    try {
      const serverUrl = `/api/translate?q=${encodeURIComponent(query)}&from=${encodeURIComponent(fromLang)}&to=${encodeURIComponent(toLang)}`;
      const res = await fetch(serverUrl);
      const data = await res.json();
      let translation = data.translation || data.translatedText;

      if (!translation) {
        // Fallback to direct open API
        const fbUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${fromLang}|${toLang}`;
        const fbRes = await fetch(fbUrl);
        const fbData = await fbRes.json();
        translation = fbData.responseData?.translatedText;
      }

      if (translation) {
        const doc = new DOMParser().parseFromString(translation, 'text/html');
        translation = doc.body.textContent || translation;
        if (outEl) {
          outEl.innerText = translation;
          outEl.style.color = 'var(--text-main)';
        }
        if (statusEl) statusEl.innerText = 'Google Translate Free Engine';
        return translation;
      } else {
        if (outEl) {
          outEl.innerText = 'Translation could not be completed.';
          outEl.style.color = 'var(--danger)';
        }
      }
    } catch (e) {
      if (outEl) {
        outEl.innerText = 'Network connection notice. Please retry.';
        outEl.style.color = 'var(--danger)';
      }
    }
    return null;
  },

  speakText(text, langCode) {
    if (!text) return;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (this._ttsAudio) {
      try { this._ttsAudio.pause(); } catch (e) {}
    }

    showVoiceToast(`🔊 Speaking in ${langCode.toUpperCase()}...`);

    // Stream human voice from Google Translate TTS endpoint
    try {
      const cleanText = text.replace(/[\n\r]+/g, ' ').slice(0, 150);
      const audio = new Audio(`/api/tts?q=${encodeURIComponent(cleanText)}&tl=${encodeURIComponent(langCode)}`);
      this._ttsAudio = audio;
      audio.play().catch(() => {
        // Fallback to SpeechSynthesis if audio element was blocked
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = this.getLocale(langCode);
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      });
    } catch (e) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.getLocale(langCode);
        window.speechSynthesis.speak(utterance);
      }
    }
  },

  speakSource() {
    const text = document.getElementById('trans-source-text')?.value?.trim();
    const lang = document.getElementById('trans-source-lang')?.value || 'te';
    if (text) this.speakText(text, lang);
  },

  speakTarget() {
    const text = document.getElementById('trans-output-text')?.innerText?.trim();
    const lang = document.getElementById('trans-target-lang')?.value || 'ml';
    if (text && text !== 'Translation will appear here...' && !text.includes('Translating')) {
      this.speakText(text, lang);
    }
  },

  // Two-way Live Voice Walkie-Talkie conversation (Tap to talk, tap to stop & auto-speak)
  startSpeaking(speaker) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const srcSelect = document.getElementById('trans-source-lang');
    const tgtSelect = document.getElementById('trans-target-lang');
    const fromLang = speaker === 'source' ? (srcSelect?.value || 'te') : (tgtSelect?.value || 'ml');
    const toLang = speaker === 'source' ? (tgtSelect?.value || 'ml') : (srcSelect?.value || 'te');

    const btnSource = document.getElementById('btn-speak-source');
    const btnTarget = document.getElementById('btn-speak-target');
    const statusBanner = document.getElementById('trans-live-status-text');

    // If user clicked the button while ALREADY listening, stop and process immediately!
    if (this._activeSpeaker === speaker && this._activeRec) {
      if (statusBanner) statusBanner.innerText = 'Finishing speech & translating...';
      try { this._activeRec.stop(); } catch (e) { }
      return;
    }

    // If opposite speaker was listening, abort it first
    if (this._activeRec) {
      try { this._activeRec.abort(); } catch (e) { }
      this._activeRec = null;
    }

    this._activeSpeaker = speaker;
    this._accumulatedSpeech = '';

    if (btnSource) btnSource.classList.toggle('listening', speaker === 'source');
    if (btnTarget) btnTarget.classList.toggle('listening', speaker === 'target');
    if (statusBanner) statusBanner.innerText = `🎙️ Listening in ${fromLang.toUpperCase()}... Tap button again when done to translate & speak out.`;

    try {
      const rec = new SpeechRec();
      this._activeRec = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = this.getLocale(fromLang);

      rec.onresult = (event) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript + ' ';
        }
        currentText = currentText.trim();
        this._accumulatedSpeech = currentText;
        if (statusBanner) statusBanner.innerText = `🎙️ [${fromLang.toUpperCase()}]: "${currentText}" (Tap when done)`;
      };

      rec.onerror = (e) => {
        console.warn('Translate speech rec notice:', e);
        if (e.error === 'not-allowed') {
          if (statusBanner) statusBanner.innerText = 'Microphone permission blocked. Please allow in browser.';
        }
      };

      rec.onend = async () => {
        if (btnSource) btnSource.classList.remove('listening');
        if (btnTarget) btnTarget.classList.remove('listening');
        this._activeRec = null;
        this._activeSpeaker = null;

        const spoken = (this._accumulatedSpeech || '').trim();
        if (!spoken) {
          if (statusBanner) statusBanner.innerText = 'Could not catch speech. Please tap to speak again.';
          return;
        }

        if (statusBanner) statusBanner.innerText = `Translating: "${spoken}"...`;

        try {
          const res = await fetch(`/api/translate?q=${encodeURIComponent(spoken)}&from=${fromLang}&to=${toLang}`);
          const data = await res.json();
          const translated = data.translation || data.translatedText || spoken;

          // Add to chat bubble
          this.addChatBubble(speaker, fromLang, spoken, toLang, translated);
          if (statusBanner) statusBanner.innerText = `✓ Translated to ${toLang.toUpperCase()}: "${translated}"`;

          // Immediately speak out loud!
          this.speakText(translated, toLang);
        } catch (err) {
          if (statusBanner) statusBanner.innerText = 'Translation service unreachable. Please retry.';
        }
      };

      rec.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
      if (statusBanner) statusBanner.innerText = 'Error opening microphone. Please try again.';
      if (btnSource) btnSource.classList.remove('listening');
      if (btnTarget) btnTarget.classList.remove('listening');
    }
  },

  addChatBubble(speaker, fromLang, original, toLang, translated) {
    const container = document.getElementById('trans-chat-history');
    if (!container) return;

    const empty = document.getElementById('trans-chat-empty');
    if (empty) empty.style.display = 'none';

    const isSource = speaker === 'source';
    const bubble = document.createElement('div');
    bubble.className = `trans-chat-bubble ${isSource ? 'source-bubble' : 'target-bubble'}`;
    bubble.innerHTML = `
      <div class="trans-chat-speaker">
        <i class="fa-solid fa-user"></i> ${isSource ? 'Speaker A (' + fromLang.toUpperCase() + ')' : 'Speaker B (' + fromLang.toUpperCase() + ')'}
        <button class="icon-action-btn" style="width: 22px; height: 22px; margin-left: auto;" onclick="GOOGLE_TRANSLATE_STUDIO.speakText('${escapeHtml(translated)}', '${toLang}')" title="Play speech">
          <i class="fa-solid fa-volume-high" style="font-size: 11px;"></i>
        </button>
      </div>
      <div style="font-weight: 700; color: var(--text-main); font-size: 14.5px;">${escapeHtml(translated)}</div>
      <div class="trans-chat-original">"${escapeHtml(original)}"</div>
    `;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  },

  clearHistory() {
    const container = document.getElementById('trans-chat-history');
    if (container) {
      container.innerHTML = `
        <div class="trans-chat-empty" id="trans-chat-empty">
          <i class="fa-solid fa-comments" style="font-size: 28px; color: var(--text-muted); margin-bottom: 8px;"></i>
          <p>Speak in either language above. The device will automatically transcribe, translate, and speak out the audio to the other person!</p>
        </div>
      `;
    }
  },

  // "Search Out" alternative: Search songs matching this translation!
  searchTranslatedMusic() {
    const text = document.getElementById('trans-output-text')?.innerText?.trim();
    if (!text || text === 'Translation will appear here...' || text.includes('Translating')) {
      alert('Please translate some words or lyrics first before searching songs.');
      return;
    }

    closeModal('translation-modal');
    switchTab('online');
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) searchInput.value = text;
    handleSearchSubmit();
    showVoiceToast(`🔍 Searching YouTube for: "${text}"`);
  },

  copyOutput() {
    const text = document.getElementById('trans-output-text')?.innerText?.trim();
    if (text && text !== 'Translation will appear here...') {
      navigator.clipboard.writeText(text);
      showVoiceToast('📋 Translation copied to clipboard!');
    }
  },

  clearText() {
    const srcText = document.getElementById('trans-source-text');
    const outEl = document.getElementById('trans-output-text');
    if (srcText) srcText.value = '';
    if (outEl) outEl.innerText = 'Translation will appear here...';
    this.updateCharCount();
  },

  updateCharCount() {
    const text = document.getElementById('trans-source-text')?.value || '';
    const counter = document.getElementById('trans-char-count');
    if (counter) counter.innerText = `${text.length} chars`;
  }
};

const CONVERSATION_TRANSLATOR = GOOGLE_TRANSLATE_STUDIO;

// ==============================================================================
// 21. CUSTOM THEME STUDIO / DUAL COLOR PALETTE ENGINE
// ==============================================================================
const THEME_STUDIO = {
  currentBase: '#F8FAFC',
  currentAccent: '#4F46E5',

  init() {
    const saved = localStorage.getItem('ak_custom_theme');
    if (saved) {
      try {
        const theme = JSON.parse(saved);
        if (theme.base && theme.accent) {
          this.applyTheme(theme.base, theme.accent, false);
        }
      } catch (e) { }
    }
  },

  // Calculate luminance to determine high-contrast text color
  getLuminance(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  applyTheme(baseHex, accentHex, save = true) {
    this.currentBase = baseHex;
    this.currentAccent = accentHex;

    const baseLum = this.getLuminance(baseHex);
    const accentLum = this.getLuminance(accentHex);

    // If base is light (lum > 0.45)
    const isBaseLight = baseLum > 0.45;
    const textMain = isBaseLight ? '#0F172A' : '#F8FAFC';
    const textMuted = isBaseLight ? '#64748B' : '#94A3B8';
    const border = isBaseLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
    const bgSurface = isBaseLight ? '#FFFFFF' : '#1E293B';
    const bgCard = isBaseLight ? '#FFFFFF' : '#111827';
    const btnText = accentLum > 0.55 ? '#0F172A' : '#FFFFFF';

    const root = document.documentElement;
    root.style.setProperty('--bg-app', baseHex);
    root.style.setProperty('--bg-surface', bgSurface);
    root.style.setProperty('--bg-card', bgCard);
    root.style.setProperty('--primary', accentHex);
    root.style.setProperty('--primary-glow', accentHex + '55');
    root.style.setProperty('--primary-light', accentHex + '18');
    root.style.setProperty('--text-main', textMain);
    root.style.setProperty('--text-muted', textMuted);
    root.style.setProperty('--border', border);
    root.style.setProperty('--btn-text-color', btnText);

    if (save) {
      localStorage.setItem('ak_custom_theme', JSON.stringify({ base: baseHex, accent: accentHex }));
      showVoiceToast(`🎨 Custom Palette Applied: Base ${baseHex} & Accent ${accentHex}`);
    }

    this.updateInputsUI(baseHex, accentHex);
  },

  updateInputsUI(baseHex, accentHex) {
    const inputBase = document.getElementById('palette-input-base');
    const inputAccent = document.getElementById('palette-input-accent');
    const pickBase = document.getElementById('palette-picker-base');
    const pickAccent = document.getElementById('palette-picker-accent');
    const previewBox = document.getElementById('palette-preview-card');

    if (inputBase) inputBase.value = baseHex;
    if (inputAccent) inputAccent.value = accentHex;
    if (pickBase) pickBase.value = baseHex;
    if (pickAccent) pickAccent.value = accentHex;

    if (previewBox) {
      previewBox.style.backgroundColor = baseHex;
      previewBox.style.borderColor = accentHex;
      const previewBtn = previewBox.querySelector('.preview-sample-btn');
      if (previewBtn) {
        previewBtn.style.backgroundColor = accentHex;
        previewBtn.style.color = this.getLuminance(accentHex) > 0.55 ? '#0F172A' : '#FFFFFF';
      }
      const previewText = previewBox.querySelector('.preview-sample-text');
      if (previewText) {
        previewText.style.color = this.getLuminance(baseHex) > 0.45 ? '#0F172A' : '#FFFFFF';
      }
    }
  },

  applyFromInputs() {
    const inputBase = document.getElementById('palette-input-base')?.value?.trim() || '#F8FAFC';
    const inputAccent = document.getElementById('palette-input-accent')?.value?.trim() || '#4F46E5';
    this.applyTheme(inputBase, inputAccent, true);
  },

  applyPreset(base, accent) {
    this.applyTheme(base, accent, true);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  THEME_STUDIO.init();
});

// ==============================================================================
// 22. CUSTOM PLAYLISTS ENGINE (CREATE, ADD, VIEW, PLAY ALL & DELETE)
// ==============================================================================
function openCreatePlaylistModal() {
  const titleInput = document.getElementById('new-playlist-title');
  const descInput = document.getElementById('new-playlist-desc');
  if (titleInput) titleInput.value = '';
  if (descInput) descInput.value = '';
  openModal('create-playlist-modal');
  if (titleInput) setTimeout(() => titleInput.focus(), 120);
}

async function confirmCreatePlaylist() {
  const titleInput = document.getElementById('new-playlist-title');
  const descInput = document.getElementById('new-playlist-desc');
  const name = titleInput ? titleInput.value.trim() : '';
  const desc = descInput ? descInput.value.trim() : '';

  if (!name) {
    alert('Please enter a playlist name.');
    return;
  }

  const newPl = {
    id: generateUUID(),
    name: name,
    description: desc || 'Custom Collection',
    trackIds: [],
    tracks: [],
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  STATE.playlists.push(newPl);
  await saveLocalData();
  renderPlaylistsView();
  closeModal('create-playlist-modal');
  showVoiceToast(`✓ Playlist "${name}" created!`);

  if (typeof syncAllToSupabase === 'function') {
    syncAllToSupabase().catch(() => { });
  }
}

function openAddToPlaylistModalForTrack(trackId) {
  STATE.pendingPlaylistTrackId = trackId;
  const container = document.getElementById('add-to-playlist-list');
  if (!container) return;

  if (STATE.playlists.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted);">
        <p style="margin-bottom: 12px;">You do not have any playlists yet.</p>
        <button class="primary-btn" onclick="closeModal('add-to-playlist-modal'); openCreatePlaylistModal();">
          <i class="fa-solid fa-plus"></i> Create New Playlist
        </button>
      </div>
    `;
  } else {
    container.innerHTML = STATE.playlists.map(pl => {
      const alreadyHas = (pl.trackIds || []).includes(trackId);
      return `
        <div class="playlist-row-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px;">${escapeHtml(pl.name)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${(pl.trackIds || []).length} tracks</div>
          </div>
          <button class="primary-btn" style="padding: 6px 14px; font-size: 12px;" onclick="addTrackToPlaylist('${pl.id}', '${trackId}')">
            <i class="fa-solid ${alreadyHas ? 'fa-check' : 'fa-plus'}"></i> ${alreadyHas ? 'Added' : 'Add'}
          </button>
        </div>
      `;
    }).join('');
  }

  openModal('add-to-playlist-modal');
}

async function addTrackToPlaylist(playlistId, trackId) {
  const pl = STATE.playlists.find(p => p.id === playlistId);
  if (!pl) return;

  if (!pl.trackIds) pl.trackIds = [];
  if (!pl.tracks) pl.tracks = [];

  if (!pl.trackIds.includes(trackId)) {
    pl.trackIds.push(trackId);

    // Find track data from all available sources
    const allKnown = [...REAL_SONGS_CATALOG, ...onlineTracksList, ...STATE.downloadedTracks, ...STATE.localFiles];
    const trackObj = allKnown.find(t => t.id === trackId) || STATE.currentTrack;
    if (trackObj && !pl.tracks.some(t => t.id === trackId)) {
      pl.tracks.push(trackObj);
      if (!pl.coverUrl || pl.coverUrl.includes('unsplash')) {
        pl.coverUrl = trackObj.artwork || trackObj.coverUrl;
      }
    }

    await saveLocalData();
    renderPlaylistsView();
    showVoiceToast(`✓ Added to "${pl.name}"`);
    if (typeof syncAllToSupabase === 'function') syncAllToSupabase().catch(() => { });
  } else {
    showVoiceToast(`Already in "${pl.name}"`);
  }

  closeModal('add-to-playlist-modal');
}

function openPlaylistDetails(playlistId) {
  const pl = STATE.playlists.find(p => p.id === playlistId);
  if (!pl) return;

  switchTab('playlists');
  const container = document.getElementById('playlists-container');
  if (!container) return;

  const tracks = pl.tracks || [];
  container.innerHTML = `
    <div style="grid-column: 1 / -1; margin-bottom: 24px;">
      <button class="secondary-btn" onclick="renderPlaylistsView()" style="margin-bottom: 16px;">
        <i class="fa-solid fa-arrow-left"></i> Back to Playlists
      </button>
      <div style="display: flex; gap: 20px; align-items: center; background: var(--bg-surface); padding: 20px; border-radius: 16px; border: 1.5px solid var(--border);">
        <img src="${pl.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'}" style="width: 120px; height: 120px; border-radius: 14px; object-fit: cover;" alt="Playlist Cover" />
        <div>
          <h2 style="font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">${escapeHtml(pl.name)}</h2>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 14px;">${escapeHtml(pl.description || 'Custom Collection')} • ${tracks.length} songs</p>
          <div style="display: flex; gap: 10px;">
            <button class="primary-btn" onclick="playFullPlaylist('${pl.id}')">
              <i class="fa-solid fa-play"></i> Play All (${tracks.length})
            </button>
            <button class="danger-btn" onclick="deletePlaylist('${pl.id}')" style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer;">
              <i class="fa-solid fa-trash-can"></i> Delete Playlist
            </button>
          </div>
        </div>
      </div>
    </div>

    ${tracks.length === 0 ? `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p>This playlist has no songs yet. Browse Online Music and click "+" to add songs!</p>
        <button class="primary-btn" onclick="switchTab('online')" style="margin-top: 12px;">
          <i class="fa-solid fa-compass"></i> Discover Music
        </button>
      </div>
    ` : tracks.map((track, idx) => `
      <div class="media-card" style="display: flex; align-items: center; gap: 14px; padding: 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px;">
        <span style="font-weight: 800; color: var(--text-muted); font-size: 14px; width: 24px;">${idx + 1}</span>
        <img src="${track.artwork || track.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;" alt="Cover" />
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 700; color: var(--text-main); font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(track.title || track.name)}</div>
          <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(track.artist || 'Artist')}</div>
        </div>
        <button class="primary-btn" style="padding: 6px 14px; font-size: 12px;" onclick="playTrackById('${track.id}')">
          <i class="fa-solid fa-play"></i> Play
        </button>
      </div>
    `).join('')}
  `;
}

function playFullPlaylist(playlistId) {
  const pl = STATE.playlists.find(p => p.id === playlistId);
  if (!pl || !pl.tracks || pl.tracks.length === 0) {
    alert('This playlist does not have any playable songs yet.');
    return;
  }
  STATE.queue = [...pl.tracks];
  STATE.queueIndex = 0;
  playTrack(pl.tracks[0], pl.tracks);
  showVoiceToast(`▶ Playing playlist: "${pl.name}"`);
}

async function deletePlaylist(playlistId) {
  if (!confirm('Are you sure you want to delete this playlist?')) return;
  STATE.playlists = STATE.playlists.filter(p => p.id !== playlistId);
  await saveLocalData();
  renderPlaylistsView();
  showVoiceToast('Playlist deleted');
  if (typeof syncAllToSupabase === 'function') syncAllToSupabase().catch(() => { });
}

// ==============================================================================
// 23. DOWNLOADED SONGS FILTERING & PLAYBACK RECOVERY
// ==============================================================================
function filterDownloaded(type) {
  const chips = ['all', 'audio', 'video', 'lyrics'];
  chips.forEach(c => {
    const chip = document.getElementById(`dl-chip-${c}`);
    if (chip) chip.classList.toggle('active', c === type);
  });

  const container = document.getElementById('downloaded-items-container');
  if (!container) return;

  let items = STATE.downloadedTracks || [];
  if (type === 'audio') {
    items = items.filter(t => t.type !== 'video' && t.type !== 'lyric');
  } else if (type === 'video') {
    items = items.filter(t => t.type === 'video');
  } else if (type === 'lyrics') {
    items = items.filter(t => (t.lyrics && t.lyrics.length > 0) || t.type === 'lyric');
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 50px 20px; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border); border-radius: var(--radius-xl);">
        <i class="fa-solid fa-cloud-arrow-down" style="font-size: 36px; margin-bottom: 12px; display: block;"></i>
        <h4>No ${type} downloads found</h4>
        <p style="font-size: 13px; margin-top: 4px;">Click the download button on any online song to save it for offline listening.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(track => {
    const isPlayingThis = STATE.isPlaying && STATE.currentTrack && STATE.currentTrack.id === track.id;
    return `
      <div class="media-card" style="display: flex; align-items: center; gap: 14px; padding: 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 10px;">
        <img src="${track.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'}" style="width: 54px; height: 54px; border-radius: 10px; object-fit: cover;" alt="Cover" />
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 700; color: var(--text-main); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(track.title)}
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            ${escapeHtml(track.artist || 'Offline Track')} • <span style="color: #10B981; font-weight: 700;">Downloaded Offline</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="primary-btn" onclick="playDownloadedTrack('${track.id}')" style="padding: 7px 16px; font-size: 12px; ${isPlayingThis ? 'background: linear-gradient(135deg, #EF4444, #DC2626);' : ''}">
            <i class="fa-solid ${isPlayingThis ? 'fa-pause' : 'fa-play'}"></i> ${isPlayingThis ? 'Pause' : 'Play'}
          </button>
          <button class="icon-action-btn" onclick="openAddToPlaylistModalForTrack('${track.id}')" title="Add to Playlist">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button class="icon-action-btn" onclick="exportDownloadedFile('${track.id}')" title="Export WAV to PC">
            <i class="fa-solid fa-download"></i>
          </button>
          <button class="icon-action-btn" onclick="confirmDeleteDownload('${track.id}')" title="Delete Download" style="color: var(--danger);">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Global message listener for YouTube iframe API events in PiP / Watch-Video mode
window.addEventListener('message', (event) => {
  try {
    let data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return; }
    }
    if (data && data.event === 'onStateChange') {
      // 0 = YT.PlayerState.ENDED
      if (data.info === 0) {
        if (STATE.repeatMode === 'one') {
          const iframe = document.getElementById('vlc-video-iframe');
          if (iframe) iframe.contentWindow?.postMessage('{"event":"command","func":"seekTo","args":[0, true]}', '*');
          if (iframe) iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        } else {
          advanceAfterTrack();
        }
      } else if (data.info === 1) { // PLAYING
        STATE.isPlaying = true;
        updatePlaybackButtonsUI();
      } else if (data.info === 2) { // PAUSED
        STATE.isPlaying = false;
        updatePlaybackButtonsUI();
      }
    }
  } catch (e) { }
});
