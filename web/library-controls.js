function libraryElement(id) {
  return document.getElementById(id);
}

function libraryCover(value) {
  if (typeof value !== 'string') return '';
  if (/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(value) && value.length <= 220000) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function syncLibraryTrack(value) {
  if (!value || typeof value.id !== 'string' || !/^[\w-]{1,160}$/.test(value.id)) return null;
  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : undefined,
    artist: typeof value.artist === 'string' ? value.artist : undefined,
    youtubeId: typeof value.youtubeId === 'string' && /^[\w-]{11}$/.test(value.youtubeId) ? value.youtubeId : undefined,
    artwork: libraryCover(value.artwork),
    category: typeof value.category === 'string' ? value.category : undefined,
    type: ['audio', 'video', 'lyric'].includes(value.type) ? value.type : undefined,
    duration: Number.isFinite(value.duration) ? value.duration : undefined,
    playedAt: Number.isFinite(value.playedAt) ? value.playedAt : undefined
  };
}

function syncLibraryPlaylist(value) {
  if (!value || typeof value.id !== 'string' || !/^[\w-]{1,160}$/.test(value.id) ||
      typeof value.name !== 'string' || !value.name.trim()) return null;
  const tracks = Array.isArray(value.tracks) ? value.tracks.map(syncLibraryTrack).filter(Boolean) : [];
  const trackIds = [...new Set((Array.isArray(value.trackIds) ? value.trackIds : tracks.map(track => track.id))
    .filter(id => typeof id === 'string' && /^[\w-]{1,160}$/.test(id)))];
  return {
    id: value.id,
    name: value.name,
    description: typeof value.description === 'string' ? value.description : '',
    coverUrl: libraryCover(value.coverUrl || value.cover),
    trackIds,
    tracks,
    createdAt: typeof value.createdAt === 'string' || Number.isFinite(value.createdAt) ? value.createdAt : undefined
  };
}

function renderRelatedSearch(query, matches) {
  const section = libraryElement('online-related-section');
  const list = libraryElement('online-related-tracks');
  const ranked = query && matches.length
    ? rankMusicRecommendations({ query, matches, excludedIds: new Set(matches.map(track => track.id)) }).slice(0, 4)
    : [];
  section.hidden = !ranked.length;
  list.replaceChildren(...ranked.map(track => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-card related-track-card';
    const image = document.createElement('img');
    image.alt = '';
    image.loading = 'lazy';
    image.src = libraryCover(track.artwork) || offlineArtwork;
    image.onerror = () => { image.hidden = true; };
    const title = document.createElement('strong');
    title.textContent = track.title;
    const artist = document.createElement('span');
    artist.textContent = track.artist;
    button.append(image, title, artist);
    button.onclick = () => playTrackById(track.id, ranked);
    return button;
  }));
}

async function readLibraryCover(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 ** 2) {
    throw new Error('Choose a JPG, PNG, or WebP image up to 10 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 384 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const cover = libraryCover(canvas.toDataURL('image/jpeg', 0.75));
    if (!cover) throw new Error('This image could not be prepared as a cover.');
    return cover;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function openDownloadSource(track) {
  const dialog = libraryElement('download-source-modal');
  dialog.downloadTrack = track;
  libraryElement('download-source-track').textContent = track.title;
  libraryElement('download-source-url').value = '';
  libraryElement('download-source-status').textContent = '';
  openModal(dialog.id);
}

async function saveDownloadSource(button) {
  const dialog = libraryElement('download-source-modal');
  const track = dialog.downloadTrack;
  const field = libraryElement('download-source-url');
  const status = libraryElement('download-source-status');
  let url;
  try { url = new URL(field.value.trim()); } catch { /* Report invalid URLs in the dialog. */ }
  if (!track || !url || url.protocol !== 'https:' || url.username || url.password ||
      /(^|\.)(youtube\.com|youtu\.be|googlevideo\.com)$/i.test(url.hostname)) {
    status.textContent = 'Enter an HTTPS URL for a downloadable audio file.';
    field.focus();
    return;
  }
  status.textContent = 'Downloading audio…';
  const saved = await handleDownloadTrack({ ...track, downloadUrl: url.href }, button);
  if (dialog.downloadTrack !== track) return;
  if (saved) {
    closeModal(dialog.id);
    filterDownloaded('all');
    libraryElement('downloaded-search').value = '';
    switchTab('downloaded');
  } else {
    status.textContent = 'Could not save this source. Check that the URL returns audio and allows browser downloads.';
  }
}

function openDownloadedMetadata(id) {
  const track = STATE.downloadedTracks.find(item => item.id === id);
  if (!track) return;
  libraryElement('edit-download-modal').dataset.trackId = id;
  libraryElement('edit-download-name').value = track.title || '';
  libraryElement('edit-download-artist').value = track.artist || '';
  libraryElement('edit-download-cover').value = '';
  openModal('edit-download-modal');
}

async function saveDownloadedMetadata(button) {
  const dialog = libraryElement('edit-download-modal');
  const id = dialog.dataset.trackId;
  const title = libraryElement('edit-download-name').value.trim();
  const artist = libraryElement('edit-download-artist').value.trim();
  if (!title) { showVoiceToast('Enter a track title.'); return; }
  button.disabled = true;
  try {
    const artwork = await readLibraryCover(libraryElement('edit-download-cover').files[0]);
    const track = STATE.downloadedTracks.find(item => item.id === id);
    if (!track || dialog.dataset.trackId !== id) return;
    if (!await saveDownloadToDB({ ...track, title, artist, artwork: artwork || track.artwork })) {
      throw new Error('Could not save audio details.');
    }
    closeModal(dialog.id);
    refreshOfflineLibrary();
    showVoiceToast('Audio details saved.');
  } catch (error) {
    showVoiceToast(error.message);
  } finally {
    button.disabled = false;
  }
}
