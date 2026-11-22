let supabaseClient;
let currentSupabaseUser;
let cloudReady = false;
let cloudChannel;
let cloudRefreshTimer;
let cloudSession = 0;
let pendingCloudWrites = new Map();
let cloudRequest;
let accountPalette;
let cloudMedia = [];
let browserMedia = [];
let cloudMediaRefreshing;

function cloudStatus(message, label = 'Cloud Sync') {
  document.getElementById('supabase-session-status').textContent = message;
  document.getElementById('top-supabase-sync-label').textContent = label;
}

function readBrowserData(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

async function initSupabaseClient() {
  if (!window.supabase) return;
  let config = SUPABASE_CONFIG;
  try {
    const response = await fetch('/api/cloud-config');
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) config = await response.json();
  } catch { /* The bundled project is available for static hosting. */ }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    // Start database requests after the auth callback releases its lock.
    setTimeout(() => switchCloudAccount(session?.user), 0);
  });
  window.addEventListener('focus', refreshCloudLibrary);
  window.addEventListener('online', refreshCloudLibrary);
}

function switchCloudAccount(user) {
  if ((currentSupabaseUser?.id || null) === (user?.id || null)) return;
  cloudSession++;
  cloudReady = false;
  cloudRequest = undefined;
  accountPalette = undefined;
  cloudMedia = [];
  cloudMediaRefreshing = undefined;
  applyBrowserAndCloudMedia();
  pendingCloudWrites = new Map();
  clearInterval(cloudRefreshTimer);
  if (cloudChannel) void supabaseClient.removeChannel(cloudChannel);
  cloudChannel = undefined;

  currentSupabaseUser = user;
  STATE.playlists = user ? [] : readBrowserData('ak_web_playlists', []);
  STATE.recentlyPlayed = user ? [] : readBrowserData('ak_recently_played', []);
  restoreWebTheme();
  renderPlaylistsView();
  void renderRecommendedSection();

  if (user) {
    cloudStatus('Loading your cloud library…', 'Connecting');
    cloudChannel = supabaseClient.channel('web-library-' + user.id);
    for (const table of ['playlists', 'user_preferences', 'web_recent_tracks', 'media_files']) {
      cloudChannel.on('postgres_changes', { event: '*', schema: 'public', table }, refreshCloudLibrary);
    }
    cloudChannel.subscribe();
    cloudRefreshTimer = setInterval(() => {
      if (!document.hidden) void refreshCloudLibrary();
    }, 20000);
    void refreshCloudLibrary();
  } else {
    cloudStatus('Sign in with the same account in each browser.');
  }
  renderCloudAccount();
}

function renderCloudAccount() {
  document.getElementById('supabase-session-title').textContent = currentSupabaseUser
    ? 'Signed in as ' + currentSupabaseUser.email : 'Sign in to sync playlists, themes, and recently played tracks.';
  document.getElementById('supabase-auth-form').hidden = Boolean(currentSupabaseUser);
  document.getElementById('supabase-signed-in-actions').hidden = !currentSupabaseUser;
}

function openSupabaseAccountModal() {
  renderCloudAccount();
  openModal('supabase-account-modal');
}

async function signInToCloud(createAccount = false) {
  const form = document.getElementById('supabase-auth-form');
  if (!form.reportValidity()) return;
  if (!supabaseClient) {
    cloudStatus('Cloud service is unavailable. Reload the web app and try again.');
    return;
  }
  const password = document.getElementById('supabase-password');
  const credentials = { email: document.getElementById('supabase-email').value.trim(), password: password.value };
  try {
    const { data, error } = createAccount
      ? await supabaseClient.auth.signUp(credentials)
      : await supabaseClient.auth.signInWithPassword(credentials);
    if (error) throw error;
    password.value = '';
    if (!data.session) cloudStatus('Check your email to confirm your account, then sign in.');
  } catch (error) {
    cloudStatus(error.message);
  }
}

async function signOutOfCloud() {
  await refreshCloudLibrary();
  if (pendingCloudWrites.size) {
    cloudStatus('Your changes are waiting to sync. Refresh the cloud library before signing out.', 'Sync retry');
    return;
  }
  const { error } = await supabaseClient.auth.signOut();
  if (error) cloudStatus(error.message);
}

function syncWebTheme(customPalette = null) {
  if (!currentSupabaseUser) return;
  const themeId = document.documentElement.dataset.theme;
  if (themeId === 'custom' && customPalette) accountPalette = customPalette;
  if (accountPalette) localStorage.setItem('ak_account_palette_' + currentSupabaseUser.id, JSON.stringify(accountPalette));
  queueCloudWrite('theme', async userId => {
    const fields = { user_id: userId, theme_id: themeId, updated_at: new Date().toISOString() };
    const result = await supabaseClient.from('user_preferences').upsert({ ...fields, web_custom_palette: accountPalette });
    return ['42703', 'PGRST204'].includes(result.error?.code)
      ? supabaseClient.from('user_preferences').upsert(fields) : result;
  });
}

function playlistTrackSnapshot(track) {
  const { id, youtubeId, title, artist, category, duration } = track;
  return { id, youtubeId, title, artist, category, duration,
    artwork: /^https?:\/\//i.test(track.artwork || '') ? track.artwork : undefined };
}

function syncPlaylistChanges(before, after) {
  const nextIds = new Set(after.map(playlist => playlist.id));
  const previous = new Map(before.map(playlist => [playlist.id, playlist]));
  for (const playlist of before) {
    if (!nextIds.has(playlist.id)) {
      queueCloudWrite('playlist:' + playlist.id, userId => supabaseClient.from('playlists')
        .delete().eq('user_id', userId).eq('id', playlist.id));
    }
  }
  for (const playlist of after) {
    if (previous.get(playlist.id) === playlist) continue;
    const tracks = playlistTrackIds(playlist).map(id => {
      const track = playlist.tracks?.find(item => item.id === id) || resolveTrackById(id);
      return track ? playlistTrackSnapshot(track) : { id };
    });
    queueCloudWrite('playlist:' + playlist.id, userId => supabaseClient.from('playlists').upsert({
      id: playlist.id, user_id: userId, name: playlist.name,
      description: JSON.stringify({ desc: playlist.description || '', tracks }),
      cover_url: libraryCover(playlist.coverUrl || playlist.cover),
      updated_at: new Date().toISOString()
    }));
  }
}

function importBrowserPlaylists() {
  if (!cloudReady) return;
  const existing = new Set(STATE.playlists.map(playlist => playlist.id));
  const guest = readBrowserData('ak_web_playlists', [])
    .filter(playlist => !existing.has(playlist.id))
    .map(playlist => ({
      ...playlist,
      id: /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(playlist.id) ? playlist.id : generateUUID()
    }));
  if (guest.length) saveLocalData([...STATE.playlists, ...guest]);
  else cloudStatus('The playlists from this browser are already in your cloud library.');
}

function generateUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

function syncRecentlyPlayed(track) {
  if (!track || !currentSupabaseUser) return;
  queueCloudWrite('played:' + track.id, async userId => {
    const result = await supabaseClient.from('web_recent_tracks').upsert({
      user_id: userId, track_id: track.id, track: playlistTrackSnapshot(track),
      played_at: new Date(track.playedAt || Date.now()).toISOString()
    });
    return ['42P01', 'PGRST205'].includes(result.error?.code) ? { error: null } : result;
  });
}

function queueCloudWrite(key, write) {
  pendingCloudWrites.set(key, write);
  void refreshCloudLibrary();
}

function refreshCloudLibrary() {
  if (!currentSupabaseUser) return Promise.resolve();
  if (!cloudRequest) {
    const session = cloudSession;
    cloudRequest = synchronizeCloudLibrary(session, currentSupabaseUser.id).finally(() => {
      if (session === cloudSession) cloudRequest = undefined;
    });
  }
  void refreshCloudMedia();
  return cloudRequest;
}

function applyBrowserAndCloudMedia() {
  const linked = new Set(cloudMedia.map(file => file.browserId).filter(Boolean));
  STATE.localFiles = [...browserMedia.filter(file => !linked.has(file.id)), ...cloudMedia];
  updateLocalStats();
  if (STATE.currentTab === 'local') renderLocalFilesView();
}

function refreshCloudMedia() {
  if (!currentSupabaseUser || cloudMediaRefreshing) return cloudMediaRefreshing;
  const session = cloudSession;
  cloudMediaRefreshing = loadCloudMedia(session, currentSupabaseUser.id).finally(() => {
    if (session === cloudSession) cloudMediaRefreshing = undefined;
  });
  return cloudMediaRefreshing;
}

async function loadCloudMedia(session, userId) {
  try {
    const { data, error } = await supabaseClient.from('media_files')
      .select('id,name,artist,file_type,size_bytes,storage_path,thumbnail_path,metadata,created_at,updated_at')
      .eq('user_id', userId).eq('is_deleted', false).order('created_at').order('id');
    if (error) throw error;
    if (session !== cloudSession) return;
    const rows = data.filter(file => file.storage_path.startsWith(userId + '/'));
    const previous = new Map(cloudMedia.map(file => [file.cloudId, file]));
    const unchanged = row => {
      const file = previous.get(row.id);
      return file?.updatedAt === row.updated_at && file.expiresAt > Date.now();
    };
    if (rows.length === cloudMedia.length && rows.every(unchanged)) return;
    const missing = rows.filter(row => !unchanged(row));
    let media = [];
    if (missing.length) {
      const signed = await supabaseClient.storage.from('media-files').createSignedUrls(missing.map(row => row.storage_path), 3600);
      if (signed.error) throw signed.error;
      media = signed.data;
    }
    if (session !== cloudSession) return;
    const urls = new Map(media.map(item => [item.path, item.signedUrl]));
    const browserFolders = readBrowserData('ak_cloud_folders_' + userId, {});
    const expiresAt = Date.now() + 55 * 60 * 1000;
    cloudMedia = rows.flatMap(row => {
      if (unchanged(row)) return [previous.get(row.id)];
      const url = urls.get(row.storage_path);
      if (!url) return [];
      const cover = libraryCover(row.thumbnail_path);
      return [{
        id: row.metadata?.web_browser_id || row.id, cloudId: row.id, browserId: row.metadata?.web_browser_id,
        name: row.name, artist: row.artist, category: row.file_type, size: row.size_bytes,
        folderId: browserFolders[row.id] || null,
        fileData: url, audioSrc: url, coverUrl: cover || (row.file_type === 'image' ? url : undefined),
        uploadDate: new Date(row.created_at).toLocaleDateString(), updatedAt: row.updated_at, expiresAt
      }];
    });
    applyBrowserAndCloudMedia();
  } catch (error) {
    console.warn('Cloud media could not refresh:', error.message);
  }
}

async function syncBrowserMedia(button) {
  if (!currentSupabaseUser) return;
  const session = cloudSession;
  const userId = currentSupabaseUser.id;
  button.disabled = true;
  try {
    const { data, error } = await supabaseClient.from('media_files').select('storage_path').eq('user_id', userId);
    if (error) throw error;
    const uploaded = new Set(data.map(row => row.storage_path));
    const bucket = supabaseClient.storage.from('media-files');
    const files = browserMedia.filter(file => typeof file.fileData === 'string' && file.fileData.startsWith('data:'));
    let count = 0;
    for (const file of files) {
      if (session !== cloudSession) return;
      const storagePath = userId + '/web/' + encodeURIComponent(file.id);
      if (uploaded.has(storagePath)) continue;
      const blob = await (await fetch(file.fileData)).blob();
      if (session !== cloudSession) return;
      const upload = await bucket.upload(storagePath, blob, { upsert: true });
      if (upload.error) throw upload.error;
      if (session !== cloudSession) return;
      const saved = await supabaseClient.from('media_files').insert({
        user_id: userId, storage_path: storagePath, name: file.name, original_name: file.name,
        title: file.name, artist: file.artist, file_type: file.category, size_bytes: blob.size,
        mime_type: blob.type || 'application/octet-stream', metadata: { web_browser_id: file.id },
        thumbnail_path: libraryCover(file.coverUrl)
      });
      if (saved.error) throw saved.error;
      count++;
    }
    if (session !== cloudSession) return;
    await refreshCloudMedia();
    cloudStatus(count ? count + ' browser file(s) backed up to your cloud library.' : 'All browser files are already backed up.');
  } catch (error) {
    if (session === cloudSession) cloudStatus('File backup could not finish. ' + error.message, 'Sync retry');
  } finally {
    button.disabled = false;
  }
}

async function updateCloudFile(file, update) {
  if (!currentSupabaseUser) return false;
  const session = cloudSession;
  const { error } = await supabaseClient.from('media_files').update({
    ...update, updated_at: new Date().toISOString()
  }).eq('user_id', currentSupabaseUser.id).eq('id', file.cloudId);
  if (session !== cloudSession) return false;
  if (error) { showVoiceToast(error.message); return false; }
  if (update.is_deleted) cloudMedia = cloudMedia.filter(item => item.cloudId !== file.cloudId);
  else Object.assign(file, { name: update.name, coverUrl: libraryCover(update.thumbnail_path) || file.coverUrl });
  applyBrowserAndCloudMedia();
  return true;
}

function moveCloudFileLocally(file, folderId) {
  const key = 'ak_cloud_folders_' + currentSupabaseUser.id;
  const folders = readBrowserData(key, {});
  if (folderId) folders[file.cloudId] = folderId;
  else delete folders[file.cloudId];
  localStorage.setItem(key, JSON.stringify(folders));
  file.folderId = folderId;
}

function parseCloudPlaylist(row) {
  let description = row.description || '';
  let tracks = [];
  try {
    const parsed = JSON.parse(description);
    if (Array.isArray(parsed?.tracks)) {
      description = parsed.desc || '';
      tracks = parsed.tracks.filter(track => typeof track?.id === 'string');
    }
  } catch { /* Other clients store the description as plain text. */ }
  return { id: row.id, name: row.name, description, coverUrl: row.cover_url,
    createdAt: row.created_at, tracks, trackIds: tracks.map(track => track.id) };
}

async function synchronizeCloudLibrary(session, userId) {
  try {
    do {
      for (const [key, write] of pendingCloudWrites) {
        const { error } = await write(userId);
        if (session !== cloudSession) return;
        if (error) throw error;
        if (pendingCloudWrites.get(key) === write) pendingCloudWrites.delete(key);
      }

      const [preferences, playlists, history] = await Promise.all([
        supabaseClient.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
        supabaseClient.from('playlists').select('*').eq('user_id', userId).order('created_at').order('id'),
        supabaseClient.from('web_recent_tracks').select('track,played_at').eq('user_id', userId)
          .order('played_at', { ascending: false }).order('track_id').limit(30)
      ]);
      if (session !== cloudSession) return;
      if (pendingCloudWrites.size) continue;
      const historyUnavailable = ['42P01', 'PGRST205'].includes(history.error?.code);
      const error = preferences.error || playlists.error || (!historyUnavailable && history.error);
      if (error) throw error;

      const preference = preferences.data;
      const theme = Object.hasOwn(THEME_NAMES, preference?.theme_id) ? preference.theme_id : 'frost-opal';
      const savedPalette = preference?.web_custom_palette || readBrowserData('ak_account_palette_' + userId, null);
      const palette = savedPalette ? normalizeCustomPalette(savedPalette) : null;
      accountPalette = palette || undefined;
      const root = document.documentElement;
      if (theme === 'custom' && palette && (root.dataset.theme !== theme ||
          ['primary', 'accent', 'bg', 'surface', 'sidebar'].some(key => activeCustomPalette?.[key] !== palette[key]))) {
        applyCustomPalette(palette, false);
      } else if (root.dataset.theme !== theme) {
        setTheme(theme, undefined, false);
      }
      const nextPlaylists = playlists.data.map(parseCloudPlaylist);
      if (JSON.stringify(STATE.playlists) !== JSON.stringify(nextPlaylists)) {
        STATE.playlists = nextPlaylists;
        renderPlaylistsView();
        const details = document.getElementById('playlist-details-modal');
        const active = details.dataset.playlistId;
        if (active && details.classList.contains('show')) {
          if (STATE.playlists.some(playlist => playlist.id === active)) openPlaylistDetails(active);
          else closeModal('playlist-details-modal');
        }
      }
      const recent = historyUnavailable ? STATE.recentlyPlayed :
        history.data.map(row => ({ ...row.track, playedAt: Date.parse(row.played_at) }));
      if (JSON.stringify(STATE.recentlyPlayed) !== JSON.stringify(recent)) {
        STATE.recentlyPlayed = recent;
        void renderRecommendedSection();
      }
      cloudReady = true;
      const time = new Date().toLocaleTimeString();
      document.getElementById('sync-last-time').textContent = 'Last synced ' + time;
      cloudStatus('Last synced ' + time, 'Synced');
    } while (pendingCloudWrites.size);
  } catch (error) {
    if (session === cloudSession) cloudStatus('Cloud sync could not finish. ' + error.message, 'Sync retry');
  }
}
