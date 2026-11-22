const offlineArtwork = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
let playbackObjectUrl;

function localAudioTrack(file) {
  if (file.category !== 'audio' || !mediaSource(file)) return null;
  return {
    id: file.id,
    fileName: file.name,
    title: file.name.replace(/\.[^.]+$/, ''),
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

function mediaSource(track) {
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
  const source = mediaSource(track);
  // Earlier builds assigned random sizes to the fixed, generated 15-second WAV.
  const generated = typeof source === 'string' && source.startsWith('data:audio/wav;base64,UklGR') &&
    source.length === 882082 && track.sizeBytes >= 4500000 && track.sizeBytes < 6500000;
  if (generated || !(source instanceof Blob || /^data:audio\//i.test(source || ''))) return null;
  return { ...track, artwork: track.artwork || offlineArtwork, isLocalAudio: true, isOffline: true };
}

function setLocalAudioSource(audio, track) {
  if (playbackObjectUrl) URL.revokeObjectURL(playbackObjectUrl);
  const source = mediaSource(track);
  playbackObjectUrl = source instanceof Blob ? URL.createObjectURL(source) : undefined;
  if (playbackObjectUrl || source) audio.src = playbackObjectUrl || source;
  else audio.removeAttribute('src');
}

function playLocalAudio(audio) {
  return audio.play().catch(error => {
    if (error.name === 'AbortError' || !STATE.currentTrack?.isLocalAudio) return;
    updatePlayPauseBtn(false);
    updatePlayingVisualizers(false);
    stopProgressTracking();
    showVoiceToast(error.name === 'NotAllowedError' ? 'Tap Play to start audio.' : 'This audio file could not be played.');
  });
}

async function handleDownloadTrack(track) {
  if (STATE.downloadedTracks.some(item => item.id === track.id && offlineAudioTrack(item))) {
    playDownloadedTrack(track.id);
    return;
  }
  const source = mediaSource(track);
  if (!source) {
    showVoiceToast('This is a YouTube stream. To listen offline, import an audio file in Downloads.');
    return;
  }
  try {
    const response = source instanceof Blob ? null : await fetch(source);
    const blob = response ? await response.blob() : source;
    if ((response && !response.ok) || !blob.size || (!track.isLocalAudio && !blob.type.startsWith('audio/'))) {
      throw new Error('Audio file unavailable');
    }
    const { fileData, audioSrc, ...metadata } = track;
    if (!await saveDownloadToDB(makeOfflineRecord(metadata, blob))) throw new Error('Storage unavailable');
    refreshOfflineLibrary();
    showVoiceToast('Saved for offline playback.');
  } catch {
    showVoiceToast('Could not save this audio file for offline playback.');
  }
}

function makeOfflineRecord(track, blob) {
  return {
    ...track,
    audioBlob: blob,
    sizeBytes: blob.size,
    downloadFormat: 'audio',
    downloadDate: new Date().toLocaleDateString(),
    offlineSaved: true,
    isLocalAudio: true,
    isOffline: true
  };
}

async function importOfflineAudio(input) {
  const files = Array.from(input.files);
  input.value = '';
  if (!files.length) return;
  input.disabled = true;
  let saved = 0;
  try {
    for (const file of files) {
      if (!file.size || (!file.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i.test(file.name))) continue;
      const item = makeOfflineRecord({
        id: `offline_${generateUUID()}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        artist: 'Imported audio',
        artwork: offlineArtwork,
        type: 'audio'
      }, file);
      if (await saveDownloadToDB(item)) saved++;
    }
    refreshOfflineLibrary();
    showVoiceToast(`Imported ${saved} of ${files.length} audio files.`);
  } finally {
    input.disabled = false;
  }
}

function refreshOfflineLibrary() {
  updateDownloadedBadges();
  renderDownloadedView();
  renderOnlineCards(onlineTracksList);
}

function playDownloadedTrack(id) {
  const queue = STATE.downloadedTracks.map(offlineAudioTrack).filter(Boolean);
  const track = queue.find(item => item.id === id);
  if (!track) {
    showVoiceToast('This entry has no usable audio file. Import the original audio in Downloads.');
    return;
  }
  if (STATE.currentTrack?.id === id && STATE.currentTrack.isOffline) togglePlayPause();
  else playTrack(track, queue);
  renderDownloadedView();
}

function exportDownloadedFile(id) {
  const track = STATE.downloadedTracks.map(offlineAudioTrack).find(item => item?.id === id);
  if (!track) return;
  const source = mediaSource(track);
  const url = source instanceof Blob ? URL.createObjectURL(source) : source;
  const extension = (/audio\/([\w-]+)/.exec(source.type || url)?.[1] || 'mpeg').replace(/^mpeg$/, 'mp3').replace(/^mp4$/, 'm4a');
  const link = document.createElement('a');
  link.href = url;
  link.download = track.fileName || `${track.title}.${extension}`;
  link.click();
  if (source instanceof Blob) setTimeout(() => URL.revokeObjectURL(url), 30000);
}
