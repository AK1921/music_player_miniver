// ==============================================================================
// AK ADVANCED MUSIC PLAYER STORE
// Resilient Playback + Queue + Track Management + Cover Artwork Upload
// ==============================================================================

import { create } from 'zustand';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Track, Playlist } from '../types';
import { NativeAudio, SoundInstance, getUniqueTrackArtwork } from '../services/nativeAudio';
import { StorageService } from '../services/storage';

export interface YouTubeBridgeControls {
  loadVideo: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number) => void;
}

const PLAYLISTS_CACHE_FILE = `${FileSystem.documentDirectory || ''}nexora_playlists.json`;

async function savePlaylistsCache(playlists: Playlist[]) {
  if (Platform.OS === 'web') return;
  try {
    await FileSystem.writeAsStringAsync(PLAYLISTS_CACHE_FILE, JSON.stringify(playlists));
  } catch (e) {}
}

async function loadPlaylistsCache(): Promise<Playlist[] | null> {
  if (Platform.OS === 'web') return null;
  try {
    const info = await FileSystem.getInfoAsync(PLAYLISTS_CACHE_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(PLAYLISTS_CACHE_FILE);
      return JSON.parse(content);
    }
  } catch (e) {}
  return null;
}

interface PlayerState {
  sound: SoundInstance | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  positionMs: number;
  durationMs: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  recentlyPlayed: Track[];
  playlists: Playlist[];
  visualizerBars: number[];
  isExpandedNowPlaying: boolean;

  // 10 Features Upgrade State
  sleepTimerEnd: number | null;
  sleepTimerMode: 'duration' | 'end_of_track' | null;
  sleepTimerMinutesRemaining: number | null;
  equalizerPreset: string;
  equalizerBass: number;
  equalizerMid: number;
  equalizerTreble: number;
  currentLyrics: { time: number; text: string }[];
  isLyricsLoading: boolean;
  youtubeBridge: YouTubeBridgeControls | null;

  // Actions
  registerYouTubeBridge: (bridge: YouTubeBridgeControls | null) => void;
  pauseForExternalVideo: () => void;
  initializeAudio: () => Promise<void>;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stopAndDismiss: () => void;
  seekTo: (positionMillis: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  setVolume: (val: number) => Promise<void>;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  deleteTrack: (trackId: string) => void;
  renameTrack: (trackId: string, newTitle: string, newArtist?: string) => void;
  updateTrackArtwork: (trackId: string, artworkUri: string) => Promise<void>;
  clearSampleTracks: () => void;
  createPlaylist: (name: string, description?: string) => string;
  deletePlaylist: (playlistId: string) => void;
  renamePlaylist: (playlistId: string, newName: string) => void;
  updatePlaylistCover: (playlistId: string, coverUrl: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  fetchPlaylists: () => Promise<void>;
  setExpandedNowPlaying: (expanded: boolean) => void;

  // New Feature Actions
  setSleepTimer: (minsOrMode: number | 'end_of_track') => void;
  cancelSleepTimer: () => void;
  setEqualizerPreset: (preset: string) => void;
  setEqualizerBand: (band: 'bass' | 'mid' | 'treble', val: number) => void;
  fetchLyrics: (track: Track) => Promise<void>;
  exportSyncToken: () => Promise<string>;
  importSyncToken: (token: string) => Promise<{ success: boolean; count: number; error?: string }>;
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: 'track-1',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    title: 'Midnight Resonance',
    artist: 'Aether Wave',
    album: 'AK Beats',
    artwork: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
    duration: 215,
  },
  {
    id: 'track-2',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3',
    title: 'Cyber Pulse',
    artist: 'Vapor Dream',
    album: 'Retrograde',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
    duration: 184,
  },
  {
    id: 'track-3',
    url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=chill-abstract-intention-12099.mp3',
    title: 'Atmospheric Solitude',
    artist: 'Lunar Static',
    album: 'Deep Space',
    artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    duration: 236,
  },
];

let visualizerInterval: any = null;
let sleepTimerInterval: any = null;

const startVisualizer = (set: any) => {
  set({ visualizerBars: [45, 65, 30, 80, 55, 90, 40, 75, 60, 35, 70, 85, 50, 65, 45, 70] });
};

const stopVisualizer = (set: any) => {
  set({ visualizerBars: Array(16).fill(6) });
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  sound: null,
  isPlaying: false,
  isBuffering: false,
  currentTrack: null,
  queue: DEFAULT_TRACKS,
  queueIndex: 0,
  positionMs: 0,
  durationMs: 0,
  volume: 1.0,
  isShuffle: false,
  repeatMode: 'all',
  recentlyPlayed: [],
  playlists: [],
  visualizerBars: [15, 30, 45, 60, 40, 20, 55, 75, 45, 30, 65, 80, 50, 25, 40, 60],
  isExpandedNowPlaying: false,

  // Feature Initial States
  sleepTimerEnd: null,
  sleepTimerMode: null,
  sleepTimerMinutesRemaining: null,
  equalizerPreset: 'flat',
  equalizerBass: 0,
  equalizerMid: 0,
  equalizerTreble: 0,
  currentLyrics: [],
  isLyricsLoading: false,
  youtubeBridge: null,

  registerYouTubeBridge: (bridge: YouTubeBridgeControls | null) => {
    set({ youtubeBridge: bridge });
  },

  pauseForExternalVideo: () => {
    const { sound, youtubeBridge } = get();
    if (youtubeBridge) {
      try { youtubeBridge.pauseVideo(); } catch (_) {}
    }
    if (sound) {
      try { sound.pause(); } catch (_) {}
    }
    set({ isPlaying: false, isBuffering: false });
    stopVisualizer(set);
  },

  fetchPlaylists: async () => {
    try {
      const saved = await loadPlaylistsCache();
      if (saved) {
        set({ playlists: saved });
      }
    } catch (e) {}
  },

  initializeAudio: async () => {
    try {
      await NativeAudio.configureAudioMode();
      const saved = await loadPlaylistsCache();
      if (saved) {
        set({ playlists: saved });
      }
    } catch (e) {
      // Gracefully continue
    }
  },

  playTrack: async (track: Track, newQueue?: Track[]) => {
    try {
      const { sound: currentSound } = get();
      if (currentSound) {
        currentSound.release();
      }

      const queue = newQueue || get().queue;
      const index = queue.findIndex(t => t.id === track.id);

      const artwork =
        track.artwork && track.artwork.startsWith('http')
          ? track.artwork
          : getUniqueTrackArtwork(track.title, track.artist);
      const finalTrack = { ...track, artwork };

      // Extract or normalize YouTube ID if present
      let ytid = finalTrack.youtubeId;
      if (!ytid && finalTrack.url) {
        const m = finalTrack.url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([A-Za-z0-9_-]{11})/);
        if (m && m[1]) ytid = m[1];
      }
      if (!ytid && finalTrack.id && finalTrack.id.startsWith('yt_') && finalTrack.id.length === 14) {
        ytid = finalTrack.id.slice(3);
      }

      // If online YouTube track -> Route to YouTube Audio Bridge
      if (ytid) {
        finalTrack.youtubeId = ytid;
        finalTrack.isOnline = true;

        set({
          sound: null,
          currentTrack: finalTrack,
          queue: queue.map(t => (t.id === finalTrack.id ? finalTrack : t)),
          queueIndex: index >= 0 ? index : 0,
          isBuffering: true,
          isPlaying: true,
          positionMs: 0,
          durationMs: finalTrack.duration ? finalTrack.duration * 1000 : 215000,
        });

        startVisualizer(set);

        const { youtubeBridge } = get();
        if (youtubeBridge) {
          youtubeBridge.loadVideo(ytid);
        }

        const recents = [finalTrack, ...get().recentlyPlayed.filter(t => t.id !== finalTrack.id)].slice(0, 20);
        set({ recentlyPlayed: recents });
        get().fetchLyrics(finalTrack);
        return;
      }

      // Local audio track -> stop YouTube bridge if active
      const { youtubeBridge } = get();
      if (youtubeBridge) {
        try { youtubeBridge.stopVideo(); } catch (_) {}
      }

      // 1. INSTANT OPTIMISTIC UI: Switch state immediately without waiting for native player
      set({
        currentTrack: finalTrack,
        queue: queue.map(t => (t.id === finalTrack.id ? finalTrack : t)),
        queueIndex: index >= 0 ? index : 0,
        isBuffering: false,
        isPlaying: true,
        positionMs: 0,
        durationMs: finalTrack.duration ? finalTrack.duration * 1000 : 215000,
      });

      // 2. Background configure if not already done
      get().initializeAudio();

      // 3. Create player with lock screen metadata
      const sound = NativeAudio.createPlayer(
        finalTrack.url,
        {
          title: finalTrack.title,
          artist: finalTrack.artist || 'AK Music',
          albumTitle: finalTrack.album || 'AK Beats',
          artworkUrl: finalTrack.artwork,
        },
        (status) => {
          set({
            isPlaying: status.isPlaying,
            positionMs: status.positionMs,
            durationMs: status.durationMs > 0 ? status.durationMs : (track.duration ? track.duration * 1000 : 215000),
          });

          if (status.positionMs >= status.durationMs && status.durationMs > 0) {
            const { sleepTimerMode, cancelSleepTimer, repeatMode } = get();
            if (sleepTimerMode === 'end_of_track') {
              cancelSleepTimer();
              get().togglePlayPause();
              return;
            }
            if (repeatMode === 'one') {
              sound.seekTo(0);
              sound.play();
            } else {
              get().playNext();
            }
          }
        }
      );

      sound.setVolume(get().volume);
      sound.play();

      const recents = [track, ...get().recentlyPlayed.filter(t => t.id !== track.id)].slice(0, 20);
      set({ sound, recentlyPlayed: recents });
      get().fetchLyrics(track);
    } catch (err) {
      console.warn('Play track error:', err);
      set({ isBuffering: false, isPlaying: false });
    }
  },

  togglePlayPause: async () => {
    const { sound, isPlaying, currentTrack, youtubeBridge } = get();
    if (!currentTrack) return;

    if (currentTrack.youtubeId) {
      if (isPlaying) {
        set({ isPlaying: false, isBuffering: false });
        stopVisualizer(set);
        if (youtubeBridge) {
          try { youtubeBridge.pauseVideo(); } catch (_) {}
        }
      } else {
        set({ isPlaying: true });
        startVisualizer(set);
        if (youtubeBridge) {
          try { youtubeBridge.playVideo(); } catch (_) {}
        }
      }
      return;
    }

    if (!sound) {
      await get().playTrack(currentTrack);
      return;
    }

    if (isPlaying) {
      // INSTANT UI RESPONSE: Pause immediately
      set({ isPlaying: false });
      stopVisualizer(set);
      try {
        sound.pause();
      } catch (e) {
        console.warn('Pause error:', e);
      }
    } else {
      set({ isPlaying: true });
      startVisualizer(set);
      try {
        sound.play();
      } catch (e) {
        console.warn('Play error:', e);
      }
    }
  },

  stopAndDismiss: () => {
    const { sound, youtubeBridge } = get();
    if (youtubeBridge) {
      try { youtubeBridge.stopVideo(); } catch (_) {}
    }
    if (sound) {
      try {
        sound.release();
      } catch {}
    }
    stopVisualizer(set);
    set({
      sound: null,
      isPlaying: false,
      isBuffering: false,
      currentTrack: null,
      positionMs: 0,
      isExpandedNowPlaying: false,
      visualizerBars: Array(16).fill(6),
    });
  },

  seekTo: async (positionMillis: number) => {
    const { sound, currentTrack, youtubeBridge } = get();
    if (currentTrack?.youtubeId && youtubeBridge) {
      try {
        youtubeBridge.seekTo(positionMillis / 1000);
      } catch (_) {}
      set({ positionMs: positionMillis });
      return;
    }
    if (sound) {
      sound.seekTo(positionMillis / 1000);
      set({ positionMs: positionMillis });
    }
  },

  playNext: async () => {
    const { queue, queueIndex, isShuffle, playTrack } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      nextIndex = 0;
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      await playTrack(nextTrack);
    }
  },

  playPrevious: async () => {
    const { queue, queueIndex, positionMs, sound, playTrack } = get();
    if (queue.length === 0) return;

    if (positionMs > 3000 && sound) {
      sound.seekTo(0);
      set({ positionMs: 0 });
      return;
    }

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      await playTrack(prevTrack);
    }
  },

  toggleShuffle: () => {
    set(state => ({ isShuffle: !state.isShuffle }));
  },

  cycleRepeatMode: () => {
    set(state => {
      const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
      const currentIndex = modes.indexOf(state.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      return { repeatMode: nextMode };
    });
  },

  setVolume: async (val: number) => {
    const { sound } = get();
    const clamped = Math.max(0, Math.min(1, val));
    if (sound) {
      sound.setVolume(clamped);
    }
    set({ volume: clamped });
  },

  addToQueue: (track: Track) => {
    set(state => ({
      queue: [...state.queue, track],
    }));
  },

  removeFromQueue: (index: number) => {
    set(state => {
      const newQueue = state.queue.filter((_, i) => i !== index);
      return { queue: newQueue };
    });
  },

  deleteTrack: async (trackId: string) => {
    const { currentTrack, queue, sound, playNext } = get();
    if (currentTrack?.id === trackId) {
      if (queue.length > 1) {
        await playNext();
      } else {
        if (sound) sound.release();
        stopVisualizer(set);
        set({ sound: null, currentTrack: null, isPlaying: false, isExpandedNowPlaying: false });
      }
    }
    set(state => ({
      queue: state.queue.filter(t => t.id !== trackId),
      recentlyPlayed: state.recentlyPlayed.filter(t => t.id !== trackId),
    }));

    // Sync soft-delete in mediaStore so track is permanently removed from library
    try {
      const { useMediaStore } = await import('./mediaStore');
      await useMediaStore.getState().softDeleteFiles([trackId]);
    } catch {}
  },

  renameTrack: async (trackId: string, newTitle: string, newArtist?: string) => {
    set(state => {
      const update = (t: Track) =>
        t.id === trackId
          ? { ...t, title: newTitle, artist: newArtist !== undefined ? newArtist : t.artist }
          : t;
      return {
        queue: state.queue.map(update),
        recentlyPlayed: state.recentlyPlayed.map(update),
        currentTrack: state.currentTrack?.id === trackId ? update(state.currentTrack) : state.currentTrack,
      };
    });

    // Update active player lockscreen if this is current track
    const sound = get().sound;
    if (get().currentTrack?.id === trackId && sound?.updateMetadata) {
      sound.updateMetadata({
        title: newTitle,
        artist: newArtist,
      });
    }

    // Sync rename in mediaStore so files and audioFilesAsTracks reflect new title & artist
    try {
      const { useMediaStore } = await import('./mediaStore');
      await useMediaStore.getState().renameFile(trackId, newTitle, newArtist);
    } catch {}
  },

  updateTrackArtwork: async (trackId: string, artworkUri: string) => {
    let persistentArtwork = artworkUri;
    try {
      persistentArtwork = await StorageService.persistLocalFile(artworkUri, `artwork_${trackId}`);
    } catch {}

    set(state => {
      const update = (t: Track) => (t.id === trackId ? { ...t, artwork: persistentArtwork } : t);
      return {
        queue: state.queue.map(update),
        recentlyPlayed: state.recentlyPlayed.map(update),
        currentTrack: state.currentTrack?.id === trackId ? update(state.currentTrack) : state.currentTrack,
      };
    });

    // Update active player lockscreen artwork
    const sound = get().sound;
    if (get().currentTrack?.id === trackId && sound?.updateMetadata) {
      sound.updateMetadata({
        title: get().currentTrack?.title || 'AK Audio',
        artist: get().currentTrack?.artist,
        artworkUrl: persistentArtwork,
      });
    }

    // Also update mediaStore if this is a stored media file
    try {
      const { useMediaStore } = await import('./mediaStore');
      const store = useMediaStore.getState();
      await store.updateFileThumbnail(trackId, persistentArtwork);
    } catch {}
  },

  clearSampleTracks: () => {
    const { sound } = get();
    if (sound) {
      sound.release();
    }
    stopVisualizer(set);
    set({
      queue: [],
      currentTrack: null,
      isPlaying: false,
      sound: null,
      positionMs: 0,
      visualizerBars: Array(16).fill(6),
    });
  },

  createPlaylist: (name: string, description?: string) => {
    const newPlaylist: Playlist = {
      id: 'pl-' + Date.now(),
      userId: 'current',
      name,
      description: description || 'Custom Playlist',
      isPublic: false,
      itemCount: 0,
      trackIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newPlaylist, ...get().playlists];
    set({ playlists: updated });
    savePlaylistsCache(updated);
    return newPlaylist.id;
  },

  deletePlaylist: (playlistId: string) => {
    const updated = get().playlists.filter(p => p.id !== playlistId);
    set({ playlists: updated });
    savePlaylistsCache(updated);
  },

  renamePlaylist: (playlistId: string, newName: string) => {
    const updated = get().playlists.map(p =>
      p.id === playlistId
        ? { ...p, name: newName, updatedAt: new Date().toISOString() }
        : p
    );
    set({ playlists: updated });
    savePlaylistsCache(updated);
  },

  updatePlaylistCover: async (playlistId: string, coverUrl: string) => {
    let persistedCover = coverUrl;
    try {
      persistedCover = await StorageService.persistLocalFile(coverUrl, `playlist_cover_${playlistId}`);
    } catch {}
    const updated = get().playlists.map(p =>
      p.id === playlistId
        ? { ...p, coverUrl: persistedCover, updatedAt: new Date().toISOString() }
        : p
    );
    set({ playlists: updated });
    savePlaylistsCache(updated);
  },

  addTrackToPlaylist: async (playlistId: string, trackId: string) => {
    const updated = get().playlists.map(pl => {
      if (pl.id !== playlistId) return pl;
      const currentTrackIds = pl.trackIds || [];
      if (currentTrackIds.includes(trackId)) return pl;
      const nextIds = [...currentTrackIds, trackId];
      return {
        ...pl,
        trackIds: nextIds,
        itemCount: nextIds.length,
        updatedAt: new Date().toISOString(),
      };
    });
    set({ playlists: updated });
    savePlaylistsCache(updated);
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    const updated = get().playlists.map(pl => {
      if (pl.id !== playlistId) return pl;
      const currentTrackIds = pl.trackIds || [];
      const nextIds = currentTrackIds.filter(id => id !== trackId);
      return {
        ...pl,
        trackIds: nextIds,
        itemCount: nextIds.length,
        updatedAt: new Date().toISOString(),
      };
    });
    set({ playlists: updated });
    savePlaylistsCache(updated);
  },

  setExpandedNowPlaying: (expanded: boolean) => {
    set({ isExpandedNowPlaying: expanded });
  },

  setSleepTimer: (minsOrMode: number | 'end_of_track') => {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }

    if (minsOrMode === 'end_of_track') {
      set({
        sleepTimerEnd: null,
        sleepTimerMode: 'end_of_track',
        sleepTimerMinutesRemaining: null,
      });
      return;
    }

    const durationMs = minsOrMode * 60 * 1000;
    const endTimestamp = Date.now() + durationMs;

    sleepTimerInterval = setInterval(() => {
      const remaining = endTimestamp - Date.now();
      if (remaining <= 0) {
        get().cancelSleepTimer();
        const { sound } = get();
        if (sound) sound.pause();
        set({ isPlaying: false });
        return;
      }
      set({
        sleepTimerMinutesRemaining: Math.ceil(remaining / 60000),
      });
    }, 5000);

    set({
      sleepTimerEnd: endTimestamp,
      sleepTimerMode: 'duration',
      sleepTimerMinutesRemaining: minsOrMode,
    });
  },

  cancelSleepTimer: () => {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }
    set({
      sleepTimerEnd: null,
      sleepTimerMode: null,
      sleepTimerMinutesRemaining: null,
    });
  },

  setEqualizerPreset: (preset: string) => {
    const presets: Record<string, { bass: number; mid: number; treble: number }> = {
      flat: { bass: 0, mid: 0, treble: 0 },
      bass_boost: { bass: 8, mid: 1, treble: -2 },
      treble_boost: { bass: -2, mid: 2, treble: 8 },
      vocal: { bass: -2, mid: 6, treble: 3 },
      acoustic: { bass: 4, mid: 2, treble: 5 },
      electronic: { bass: 9, mid: 2, treble: 6 },
      rock: { bass: 6, mid: -1, treble: 7 },
    };
    const p = presets[preset] || presets.flat;
    set({
      equalizerPreset: preset,
      equalizerBass: p.bass,
      equalizerMid: p.mid,
      equalizerTreble: p.treble,
    });
  },

  setEqualizerBand: (band: 'bass' | 'mid' | 'treble', val: number) => {
    if (band === 'bass') set({ equalizerBass: val });
    if (band === 'mid') set({ equalizerMid: val });
    if (band === 'treble') set({ equalizerTreble: val });
  },

  fetchLyrics: async (track: Track) => {
    set({ isLyricsLoading: true });
    try {
      const artist = encodeURIComponent(track.artist || '');
      const title = encodeURIComponent(track.title.replace(/\[.*?\]|\(.*?\)/g, '').trim());
      const res = await fetch(`https://lrclib.net/api/get?artist_name=${artist}&track_name=${title}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.syncedLyrics) {
          const lines: string[] = data.syncedLyrics.split('\n');
          const parsed: { time: number; text: string }[] = [];
          const regex = /\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;
          for (const line of lines) {
            const m = regex.exec(line);
            if (m) {
              const minutes = parseInt(m[1], 10);
              const seconds = parseFloat(m[2]);
              const text = m[3].trim();
              if (text) parsed.push({ time: Math.round(minutes * 60 + seconds), text });
            }
          }
          if (parsed.length > 0) {
            set({ currentLyrics: parsed, isLyricsLoading: false });
            return;
          }
        }
      }
    } catch (e) {}

    // Rhythmic fallback lyrics
    const fallback = [
      { time: 5, text: `♪ ${track.title} ♪` },
      { time: 15, text: `Artist: ${track.artist}` },
      { time: 30, text: 'Hear the melody resonating through the rhythm...' },
      { time: 48, text: 'Feel the beat taking over the atmosphere...' },
      { time: 70, text: '♪ Beautiful harmonies in high fidelity ♪' },
      { time: 95, text: 'Living the music, lost in the sound...' },
      { time: 125, text: '♪ Instrumental Breakdown & Bridge ♪' },
      { time: 160, text: 'The chorus echoes through the night...' },
      { time: 195, text: `♪ Outro – ${track.title} ♪` }
    ];
    set({ currentLyrics: fallback, isLyricsLoading: false });
  },

  exportSyncToken: async () => {
    const payload = {
      version: 1,
      app: 'AK_MOBILE',
      exportedAt: new Date().toISOString(),
      playlists: get().playlists,
      recentlyPlayed: get().recentlyPlayed,
    };
    const jsonStr = encodeURIComponent(JSON.stringify(payload)).replace(/%([\dA-F]{2})/g,
      (_escape, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    // Encode UTF-8 bytes so playlist titles can move between web and native.
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let block = 0, charCode, idx = 0, map = chars;
      jsonStr.charAt(idx | 0) || (map = '=', idx % 1);
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)) {
      charCode = jsonStr.charCodeAt(idx += 3 / 4);
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return 'AK-SYNC:' + output;
  },

  importSyncToken: async (token: string) => {
    let raw = token.trim();
    if (raw.startsWith('AK-SYNC:')) raw = raw.replace('AK-SYNC:', '');
    try {
      // Decode Base64 safe for React Native
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let str = raw.replace(/=+$/, '');
      let output = '';
      if (str.length % 4 === 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
      }
      for (let bc = 0, bs = 0, buffer, idx = 0;
        buffer = str.charAt(idx++);
        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
          bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
      ) {
        buffer = chars.indexOf(buffer);
      }
      let decoded = output;
      try {
        const escapedBytes = Array.from(output, char => '%' + char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
        decoded = decodeURIComponent(escapedBytes);
      } catch {
        // Earlier mobile tokens stored Latin-1 text directly.
      }
      const data = JSON.parse(decoded);
      let count = 0;
      if (Array.isArray(data.playlists)) {
        const existingIds = new Set(get().playlists.map(p => p.id));
        const merged = [...get().playlists];
        data.playlists.forEach((pl: Playlist) => {
          if (!existingIds.has(pl.id)) {
            merged.push(pl);
            count++;
          }
        });
        set({ playlists: merged });
        savePlaylistsCache(merged);
      }
      return { success: true, count };
    } catch (e) {
      return { success: false, count: 0 };
    }
  },
}));
