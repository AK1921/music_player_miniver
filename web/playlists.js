function playlistTrackIds(playlist) {
  return Array.isArray(playlist.trackIds) ? playlist.trackIds :
    [...new Set((playlist.tracks || []).map(track => track.id).filter(Boolean))];
}

function playlistTrack(playlist, id) {
  const available = typeof resolveTrackById === 'function' ? resolveTrackById(id) : null;
  if (available) return available;
  const saved = playlist.tracks?.find(track => track && track.id === id);
  if (saved && (saved.title || saved.youtubeId)) {
    return {
      ...saved,
      title: saved.title || 'Playlist Track',
      artist: saved.artist || 'Artist',
      artwork: saved.artwork || offlineArtwork,
      isLocalAudio: !!saved.isLocalAudio,
      isOffline: !!saved.isOffline
    };
  }
  if (String(id).startsWith('yt_') || /^yt_[\w-]{11}$/.test(id)) {
    const youtubeId = String(id).replace(/^yt_/, '');
    return {
      id,
      youtubeId,
      title: saved?.title || 'YouTube Track',
      artist: saved?.artist || 'YouTube',
      artwork: saved?.artwork || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      isLocalAudio: false,
      isOffline: false
    };
  }
  return saved || null;
}

function persistPlaylists(playlists) { return saveLocalData(playlists); }

function openCreatePlaylistModal(fromAdd = false) {
  if (!fromAdd) STATE.targetTrackForPlaylist = null;
  closeModal('add-to-playlist-modal');
  const input = document.getElementById('new-playlist-title');
  if (input) input.value = '';
  const desc = document.getElementById('new-playlist-desc');
  if (desc) desc.value = '';
  openModal('create-playlist-modal');
  if (input) input.focus();
}

function withPlaylistTrack(playlist, track) {
  const ids = playlistTrackIds(playlist);
  if (ids.includes(track.id)) return playlist;
  const snapshot = {
    id: track.id,
    youtubeId: track.youtubeId || (String(track.id).startsWith('yt_') ? String(track.id).slice(3) : null),
    title: track.title || 'Untitled Song',
    artist: track.artist || 'Unknown Artist',
    artwork: track.artwork || track.coverUrl || offlineArtwork,
    duration: track.duration || 180,
    category: track.category || 'music',
    type: track.type || 'audio',
    isLocalAudio: !!track.isLocalAudio,
    isOffline: !!track.isOffline
  };
  return {
    ...playlist,
    trackIds: [...ids, track.id],
    tracks: [...(playlist.tracks || []).filter(t => t && t.id !== track.id), snapshot]
  };
}

function confirmCreatePlaylist() {
  const input = document.getElementById('new-playlist-title');
  const name = input.value.trim();
  if (!name) {
    showVoiceToast('Enter a playlist name.');
    input.focus();
    return;
  }
  const track = STATE.targetTrackForPlaylist;
  let playlist = {
    id: generateUUID(),
    name,
    description: document.getElementById('new-playlist-desc').value.trim(),
    coverUrl: track?.youtubeId ? track.artwork : offlineArtwork,
    trackIds: [],
    tracks: [],
    createdAt: new Date().toISOString()
  };
  if (track) playlist = withPlaylistTrack(playlist, track);
  if (!persistPlaylists([...STATE.playlists, playlist])) return;
  STATE.targetTrackForPlaylist = null;
  closeModal('create-playlist-modal');
  showVoiceToast(track ? 'Playlist created and song added.' : 'Playlist created.');
}

function openAddToPlaylistModalForTrack(id) {
  const track = resolveTrackById(id);
  if (!track) {
    showVoiceToast('This track has no playable source.');
    return;
  }
  STATE.targetTrackForPlaylist = track;
  const nameEl = document.getElementById('add-target-track-name');
  if (nameEl) nameEl.textContent = `Song: ${track.title}`;
  const searchInput = document.getElementById('add-playlist-search-input');
  if (searchInput) searchInput.value = '';
  filterPlaylistOptions('');
  openModal('add-to-playlist-modal');
}

function filterPlaylistOptions(query = '') {
  const q = String(query).toLowerCase().trim();
  const track = STATE.targetTrackForPlaylist;
  const options = document.getElementById('add-playlist-options-list');
  if (!options) return;

  if (!STATE.playlists.length) {
    const empty = document.createElement('p');
    empty.style.color = 'var(--text-muted)';
    empty.style.fontSize = '12px';
    empty.textContent = 'Create a playlist to add this track.';
    options.replaceChildren(empty);
    return;
  }

  const filtered = STATE.playlists.filter(pl => !q || pl.name.toLowerCase().includes(q));
  if (!filtered.length) {
    const noMatch = document.createElement('p');
    noMatch.style.color = 'var(--text-muted)';
    noMatch.style.fontSize = '12px';
    noMatch.textContent = `No playlists found matching "${query}".`;
    options.replaceChildren(noMatch);
    return;
  }

  options.replaceChildren(...filtered.map(playlist => {
    const button = document.createElement('button');
    const alreadyAdded = track ? playlistTrackIds(playlist).includes(track.id) : false;
    button.type = 'button';
    button.className = 'secondary-btn';
    button.style.display = 'flex';
    button.style.justifyContent = 'space-between';
    button.style.alignItems = 'center';
    button.style.width = '100%';
    button.innerHTML = `<span><i class="fa-solid fa-folder-music" style="margin-right: 8px; color: var(--primary);"></i> ${escapeHtml(playlist.name)}</span> ${alreadyAdded ? '<span style="font-size: 11px; opacity: 0.6;">(Added)</span>' : ''}`;
    button.disabled = alreadyAdded;
    button.onclick = () => {
      if (!track) return;
      const updated = STATE.playlists.map(item => item.id === playlist.id ? withPlaylistTrack(item, track) : item);
      if (!persistPlaylists(updated)) return;
      STATE.targetTrackForPlaylist = null;
      closeModal('add-to-playlist-modal');
      showVoiceToast(`Added "${track.title}" to playlist "${playlist.name}".`);
    };
    return button;
  }));
}

function deletePlaylist(id) {
  const playlist = STATE.playlists.find(item => item.id === id);
  if (!playlist) return;
  openDeleteConfirmModal({
    title: 'Delete Playlist?',
    name: playlist.name,
    desc: 'Remove this playlist from your library?',
    onConfirm: () => {
      persistPlaylists(STATE.playlists.filter(item => item.id !== id));
      renderPlaylistsView();
      showVoiceToast('Playlist deleted.');
    }
  });
}

function editPlaylist(id) {
  const playlist = STATE.playlists.find(item => item.id === id);
  if (!playlist) return;
  const panel = libraryElement('edit-playlist-modal');
  panel.dataset.playlistId = id;
  libraryElement('edit-playlist-name').value = playlist.name;
  libraryElement('edit-playlist-description').value = playlist.description || '';
  libraryElement('edit-playlist-cover').value = '';
  libraryElement('edit-playlist-reset-cover').checked = false;
  libraryElement('edit-playlist-status').textContent = '';
  closeModal('playlist-details-modal');
  openModal(panel.id);
}

async function savePlaylistChanges(button) {
  const panel = libraryElement('edit-playlist-modal');
  const id = panel.dataset.playlistId;
  const title = libraryElement('edit-playlist-name');
  const description = libraryElement('edit-playlist-description').value.trim();
  const status = libraryElement('edit-playlist-status');
  const name = title.value.trim();
  if (!name) { status.textContent = 'Enter a playlist name.'; title.focus(); return; }
  const resetCover = libraryElement('edit-playlist-reset-cover').checked;
  button.disabled = true;
  try {
    const image = await readLibraryCover(libraryElement('edit-playlist-cover').files[0]);
    const playlist = STATE.playlists.find(item => item.id === id);
    if (!playlist || panel.dataset.playlistId !== id) return;
    const coverUrl = image || (resetCover ? offlineArtwork : playlist.coverUrl || playlist.cover);
    const updated = { ...playlist, name, description, coverUrl };
    if (!persistPlaylists(STATE.playlists.map(item => item.id === id ? updated : item))) return;
    closeModal(panel.id);
    showVoiceToast('Playlist saved.');
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function renderPlaylistsView() {
  const container = document.getElementById('playlists-container');
  if (!container) return;

  const countBadge = document.getElementById('sidebar-playlist-count');
  if (countBadge) countBadge.innerText = STATE.playlists.length;

  if (STATE.playlists.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px dashed var(--border); border-radius: var(--radius-xl);">
        <i class="fa-solid fa-list-ul" style="font-size: 40px; color: var(--text-subtle); margin-bottom: 12px;"></i>
        <h3 style="font-size: 18px; font-weight: 800; margin-bottom: 4px;">No Custom Playlists Yet</h3>
        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">Group your favorite online songs and downloaded audio into playlists.</p>
        <button class="primary-btn" onclick="openCreatePlaylistModal()">
          <i class="fa-solid fa-plus"></i> Create First Playlist
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = STATE.playlists.map(pl => {
    return `
      <div class="media-card playlist-card">
        <div class="card-thumb-wrapper" style="cursor: pointer;" data-playlist-action="openPlaylistDetails" data-playlist-id="${escapeHtml(pl.id)}">
          <img src="${escapeHtml(libraryCover(pl.coverUrl || pl.cover) || offlineArtwork)}" class="card-thumb" alt="" loading="lazy" />
          <span class="card-type-tag tag-video">${playlistTrackIds(pl).length} TRACKS</span>
        </div>
        <div class="card-info" style="cursor: pointer;" data-playlist-action="openPlaylistDetails" data-playlist-id="${escapeHtml(pl.id)}">
          <div class="card-title">${escapeHtml(pl.name)}</div>
          <div class="card-artist">${escapeHtml(pl.description || 'Custom Collection')}</div>
        </div>
        <div class="card-actions-bar">
          <button class="primary-btn" style="padding: 6px 12px; font-size: 11.5px;" data-playlist-action="playFullPlaylist" data-playlist-id="${escapeHtml(pl.id)}" onclick="playFullPlaylist('${escapeHtml(pl.id)}')">
            <i class="fa-solid fa-play"></i> Play All
          </button>
          <button class="secondary-btn" style="padding: 6px 10px; font-size: 11.5px;" data-playlist-action="openPlaylistDetails" data-playlist-id="${escapeHtml(pl.id)}" onclick="openPlaylistDetails('${escapeHtml(pl.id)}')" title="View playlist tracks">
            <i class="fa-solid fa-list"></i> View (${playlistTrackIds(pl).length})
          </button>
          <button class="icon-action-btn" style="color: var(--danger);" data-playlist-action="deletePlaylist" data-playlist-id="${escapeHtml(pl.id)}" onclick="deletePlaylist('${escapeHtml(pl.id)}')" title="Delete Playlist">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <button type="button" class="icon-action-btn" data-playlist-action="editPlaylist" data-playlist-id="${escapeHtml(pl.id)}" onclick="editPlaylist('${escapeHtml(pl.id)}')" title="Edit playlist" aria-label="Edit playlist">
            <i class="fa-solid fa-pen" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openPlaylistDetails(playlistId) {
  const pl = STATE.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  document.getElementById('playlist-details-modal').dataset.playlistId = playlistId;
  const titleEl = document.getElementById('playlist-details-title');
  if (titleEl) titleEl.innerText = pl.name;

  const countEl = document.getElementById('playlist-details-count');
  const listEl = document.getElementById('playlist-details-items-list');
  const playAllBtn = document.getElementById('btn-play-all-from-details');
  document.getElementById('btn-edit-playlist-details').onclick = () => editPlaylist(playlistId);

  if (playAllBtn) {
    playAllBtn.onclick = () => {
      closeModal('playlist-details-modal');
      playFullPlaylist(playlistId);
    };
  }

  const trackIds = playlistTrackIds(pl);
  if (countEl) countEl.innerText = `${trackIds.length} track(s) • ${pl.description || 'Collection'}`;

  if (!listEl) return;
  if (trackIds.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 34px 14px; color: var(--text-muted);">
        <i class="fa-solid fa-compact-disc" style="font-size: 32px; margin-bottom: 8px; color: var(--text-subtle);"></i>
        <p style="font-size: 13.5px; font-weight: 700;">No tracks in this playlist yet</p>
        <p style="font-size: 12px; margin-top: 4px;">Use the add-to-playlist button on a song.</p>
      </div>
    `;
    openModal('playlist-details-modal');
    return;
  }

  listEl.innerHTML = trackIds.map((tid, idx) => {
    const track = playlistTrack(pl, tid);
    if (!track) {
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px dashed var(--border); border-radius: var(--radius-md);">
          <span style="font-size: 12px; color: var(--text-muted);">Track ${idx + 1} is unavailable</span>
          <button class="ai-del-btn" data-playlist-action="removeTrackFromPlaylist" data-playlist-id="${escapeHtml(playlistId)}" data-track-id="${escapeHtml(tid)}" title="Remove"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
    }

    const isThisPlaying = STATE.isPlaying && STATE.currentTrack && STATE.currentTrack.id === track.id;
    const badgeText = track.isOffline ? 'Offline Audio' : 'Online Stream';
    const badgeClass = track.isOffline ? 'badge-offline' : 'tag-video';

    return `
      <div class="download-row ${isThisPlaying ? 'is-playing' : ''}" style="padding: 8px 12px; margin-bottom: 0;">
        <img src="${escapeHtml(track.artwork || offlineArtwork)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;" alt="Art" />
        <div style="flex: 1; min-width: 0; margin-left: 10px;">
          <div style="font-weight: 700; font-size: 13px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(track.title)}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span>${escapeHtml(track.artist)}</span>
            <span>•</span>
            <span class="${badgeClass}" style="font-size: 10px; padding: 2px 6px;">${badgeText}</span>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="primary-btn" data-playlist-action="playSinglePlaylistTrack" data-playlist-id="${escapeHtml(playlistId)}" data-track-id="${escapeHtml(track.id)}" onclick="playSinglePlaylistTrack('${escapeHtml(playlistId)}', '${escapeHtml(track.id)}')" style="padding: 5px 10px; font-size: 11px;">
            <i class="fa-solid fa-play"></i> Play
          </button>
          <button class="ai-del-btn" data-playlist-action="removeTrackFromPlaylist" data-playlist-id="${escapeHtml(playlistId)}" data-track-id="${escapeHtml(track.id)}" onclick="removeTrackFromPlaylist('${escapeHtml(playlistId)}', '${escapeHtml(track.id)}')" title="Remove from playlist">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  openModal('playlist-details-modal');
}

function playSinglePlaylistTrack(playlistId, trackId) {
  const pl = STATE.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  const matched = playlistTrackIds(pl).map(id => playlistTrack(pl, id)).filter(Boolean);
  let target = matched.find(t => t.id === trackId) || playlistTrack(pl, trackId);
  if (target) {
    closeModal('playlist-details-modal');
    if (typeof showBottomPlayer === 'function') showBottomPlayer();
    if (target.type === 'video') {
      if (typeof PLAYBACK_CONTROLLER !== 'undefined' && PLAYBACK_CONTROLLER.playVideo) {
        PLAYBACK_CONTROLLER.playVideo(target);
      } else if (typeof playTrack === 'function') {
        playTrack(target, matched.length ? matched : [target]);
      }
    } else {
      if (typeof PLAYBACK_CONTROLLER !== 'undefined' && PLAYBACK_CONTROLLER.playAudio) {
        PLAYBACK_CONTROLLER.playAudio(target, matched.length ? matched : [target]);
      } else if (typeof playTrack === 'function') {
        playTrack(target, matched.length ? matched : [target]);
      } else if (typeof playTrackById === 'function') {
        playTrackById(target.id, matched);
      }
    }
  } else {
    showVoiceToast('Track is currently unavailable.');
  }
}

function removeTrackFromPlaylist(playlistId, trackId) {
  const pl = STATE.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  const updated = {
    ...pl,
    trackIds: playlistTrackIds(pl).filter(id => id !== trackId),
    tracks: (pl.tracks || []).filter(track => track && track.id !== trackId)
  };
  if (persistPlaylists(STATE.playlists.map(item => item.id === playlistId ? updated : item))) {
    openPlaylistDetails(playlistId);
    renderPlaylistsView();
    showVoiceToast('Removed track from playlist.');
  }
}

function playFullPlaylist(playlistId) {
  const pl = STATE.playlists.find(p => p.id === playlistId);
  if (!pl || playlistTrackIds(pl).length === 0) {
    showVoiceToast('This playlist is empty. Add songs to it first!');
    return;
  }
  const matched = playlistTrackIds(pl)
    .map(id => playlistTrack(pl, id))
    .filter(Boolean);

  if (matched.length > 0) {
    closeModal('playlist-details-modal');
    if (typeof showBottomPlayer === 'function') showBottomPlayer();
    const first = matched[0];
    if (first.type === 'video') {
      if (typeof PLAYBACK_CONTROLLER !== 'undefined' && PLAYBACK_CONTROLLER.playVideo) {
        PLAYBACK_CONTROLLER.playVideo(first);
      } else if (typeof playTrack === 'function') {
        playTrack(first, matched);
      }
    } else {
      if (typeof PLAYBACK_CONTROLLER !== 'undefined' && PLAYBACK_CONTROLLER.playAudio) {
        PLAYBACK_CONTROLLER.playAudio(first, matched);
      } else if (typeof playTrack === 'function') {
        playTrack(first, matched);
      } else if (typeof playTrackById === 'function') {
        playTrackById(first.id, matched);
      }
    }
  } else {
    showVoiceToast('No playable songs found in this playlist.');
  }
}


document.addEventListener('click', event => {
  const button = event.target.closest('[data-playlist-action]');
  if (!button) return;
  const { playlistAction, playlistId, trackId } = button.dataset;
  const actions = {
    openPlaylistDetails, playFullPlaylist, deletePlaylist, removeTrackFromPlaylist, playSinglePlaylistTrack, editPlaylist
  };
  if (Object.hasOwn(actions, playlistAction)) actions[playlistAction](playlistId, trackId);
});

// Explicit window exports for direct invocations
window.openCreatePlaylistModal = openCreatePlaylistModal;
window.confirmCreatePlaylist = confirmCreatePlaylist;
window.openAddToPlaylistModalForTrack = openAddToPlaylistModalForTrack;
window.deletePlaylist = deletePlaylist;
window.editPlaylist = editPlaylist;
window.savePlaylistChanges = savePlaylistChanges;
window.renderPlaylistsView = renderPlaylistsView;
window.openPlaylistDetails = openPlaylistDetails;
window.playSinglePlaylistTrack = playSinglePlaylistTrack;
window.removeTrackFromPlaylist = removeTrackFromPlaylist;
window.playFullPlaylist = playFullPlaylist;
window.filterPlaylistOptions = filterPlaylistOptions;
