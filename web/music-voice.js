(() => {
  let recognition;
  let restartTimer;
  let startupTimer;
  let active = false;
  let lastVolume = 85;
  let commandVersion = 0;

  function updateMicrophone(listening) {
    const button = document.getElementById('btn-persistent-mic');
    button?.classList.toggle('is-active', listening);
    button?.setAttribute('aria-pressed', String(listening));
  }

  function stopMusicVoice(message) {
    active = false;
    commandVersion++;
    clearTimeout(restartTimer);
    clearTimeout(startupTimer);
    const session = recognition;
    recognition = undefined;
    try { session?.abort(); } catch { /* The browser may have already stopped listening. */ }
    setMusicVoiceDucking(false);
    updateMicrophone(false);
    if (message) showVoiceToast(message);
  }

  function search(query) {
    const input = document.getElementById('global-search-input');
    if (!input) return;
    input.value = query;
    return handleSearchSubmit();
  }

  function setVolume(value) {
    const volume = Math.max(0, Math.min(100, value));
    const slider = document.getElementById('volume-slider');
    if (slider) slider.value = volume;
    setPlayerVolume(volume);
  }

  function execute(raw) {
    const command = window.parseStudioVoiceCommand(raw);
    const version = ++commandVersion;
    switch (command.action) {
      case 'empty': return;
      case 'online': case 'downloaded': case 'playlists': case 'local': case 'vault':
        switchTab(command.action); return;
      case 'settings': openSettingsModal(); return;
      case 'translator': openTranslationModal(); return;
      case 'calculator': openCalculatorModal(); return;
      case 'assistant': openAiAssistantModal(); return;
      case 'sync': openSupabaseAccountModal(); return;
      case 'health': openLibraryHealthModal(); return;
      case 'up': case 'down': case 'top': case 'bottom': {
        const viewport = document.getElementById('viewport');
        if (!viewport) return;
        if (command.action === 'top' || command.action === 'bottom') {
          viewport.scrollTo({ top: command.action === 'top' ? 0 : viewport.scrollHeight, behavior: 'smooth' });
        } else {
          viewport.scrollBy({ top: viewport.clientHeight * (command.action === 'up' ? -0.8 : 0.8), behavior: 'smooth' });
        }
        return;
      }
      case 'play': if (!STATE.isPlaying) playCurrentOrResume(); return;
      case 'pause': if (STATE.isPlaying) pausePlayback(); return;
      case 'stop': stopPlayback(); return;
      case 'next': case 'previous': {
        if (!STATE.queue.length) {
          showVoiceToast('Choose a song first to start a queue.');
          return;
        }
        if (command.action === 'next') playNext();
        else playPrev();
        return;
      }
      case 'volume': setVolume(command.value); return;
      case 'louder': setVolume((STATE.volume ?? 85) + 15); return;
      case 'quieter': setVolume((STATE.volume ?? 85) - 15); return;
      case 'mute':
        if (STATE.volume > 0) lastVolume = STATE.volume;
        setVolume(0);
        return;
      case 'unmute': if (STATE.volume === 0) setVolume(lastVolume); return;
      case 'sleep': setSleepTimer(30); return;
      case 'mood': searchByMood(command.value === 'relax' ? 'relaxing' : command.value); return;
      case 'playQuery': {
        const queue = [
          ...STATE.downloadedTracks.map(offlineAudioTrack).filter(Boolean),
          ...STATE.localFiles.map(localAudioTrack).filter(Boolean),
          ...onlineTracksList, ...REAL_SONGS_CATALOG
        ];
        const query = command.query.toLowerCase();
        const found = queue.find(track => track.title.toLowerCase() === query) ||
          queue.find(track => `${track.title} ${track.artist}`.toLowerCase().includes(query));
        if (found) {
          const unique = [...new Map(queue.map(track => [track.id, track])).values()];
          PLAYBACK_CONTROLLER.playAudio(found, unique);
        } else {
          void search(command.query)?.then(tracks => {
            if (!active || version !== commandVersion) return;
            if (tracks?.length) PLAYBACK_CONTROLLER.playAudio(tracks[0], tracks);
          });
        }
        return;
      }
      case 'search': search(command.query); return;
    }
  }

  function toggleMusicVoice() {
    if (active) {
      stopMusicVoice('Microphone off.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !window.isSecureContext) {
      showVoiceToast('Voice commands require a supported browser on HTTPS or localhost.');
      return;
    }

    const session = new SpeechRecognition();
    const handled = new Map();
    let playTimer;
    const clearInterim = () => clearTimeout(playTimer);
    active = true;
    recognition = session;
    setMusicVoiceDucking(true);
    updateMicrophone(true);
    showVoiceToast('Opening microphone…');
    session.continuous = true;
    session.interimResults = true;
    session.lang = 'en-US';

    function start() {
      clearTimeout(startupTimer);
      startupTimer = setTimeout(() => stopMusicVoice('Microphone startup timed out. Tap to try again.'), 10000);
      try { session.start(); } catch { stopMusicVoice('Could not open the microphone. Check browser permissions.'); }
    }

    session.onstart = () => {
      clearTimeout(startupTimer);
      handled.clear();
      if (recognition === session) updateMicrophone(true);
    };
    session.onresult = event => {
      if (recognition !== session) return;
      clearInterim();
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;
        const { action } = window.parseStudioVoiceCommand(transcript);
        const run = () => {
          if (recognition !== session || handled.get(i) === action) return;
          handled.set(i, action);
          execute(transcript);
        };
        if (result.isFinal || action === 'stop' || action === 'pause') run();
        else if (action === 'play') playTimer = setTimeout(run, 160);
      }
    };
    session.onend = () => {
      clearInterim();
      clearTimeout(startupTimer);
      if (recognition !== session || !active) return;
      restartTimer = setTimeout(() => { if (recognition === session && active) start(); }, 80);
    };
    session.onerror = event => {
      if (recognition !== session) return;
      if (event.error === 'no-speech') return;
      const messages = {
        'not-allowed': 'Allow microphone access in your browser settings.',
        'service-not-allowed': 'Your browser blocked speech recognition.',
        'network': 'Speech recognition lost its connection. Try again.',
      };
      stopMusicVoice(messages[event.error] || 'Speech recognition stopped. Tap the microphone to try again.');
    };
    start();
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden && active) stopMusicVoice(); });
  window.toggleMusicVoice = toggleMusicVoice;
  window.stopMusicVoice = stopMusicVoice;
})();
