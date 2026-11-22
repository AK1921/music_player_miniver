import { parseMusicCommand } from '../../../web/music-command-parser';
import { usePlayerStore } from '../../stores/playerStore';
import type { Track } from '../../types';

type Context = {
  tracks: Track[];
  scroll: (direction: 'up' | 'down' | 'top' | 'bottom') => void;
  search: (query: string) => void;
  playMood: (mood: string) => boolean;
};

let lastAudibleVolume = 1;

export function executeMusicCommand(raw: string, { tracks, scroll, search, playMood }: Context) {
  const command = parseMusicCommand(raw);
  const player = usePlayerStore.getState();
  switch (command.action) {
    case 'empty': return 'Say or type a command.';
    case 'up': case 'down': case 'top': case 'bottom': scroll(command.action); return;
    case 'play': {
      if (player.isPlaying) return;
      if (player.currentTrack) {
        void player.togglePlayPause();
        return;
      }
      const queue = player.queue.length ? player.queue : tracks;
      const first = queue[player.queueIndex] ?? queue[0];
      if (!first) return 'Choose a song first.';
      void player.playTrack(first, queue);
      return;
    }
    case 'pause': if (player.isPlaying) void player.togglePlayPause(); return;
    case 'stop': player.stopAndDismiss(); return;
    case 'next': case 'previous':
      if (!player.queue.length) return 'Choose a song first to start a queue.';
      if (command.action === 'next') void player.playNext();
      else void player.playPrevious();
      return;
    case 'volume': void player.setVolume(command.value / 100); return;
    case 'louder': void player.setVolume(player.volume + 0.15); return;
    case 'quieter': void player.setVolume(player.volume - 0.15); return;
    case 'mute':
      if (player.volume > 0) lastAudibleVolume = player.volume;
      void player.setVolume(0);
      return;
    case 'unmute': if (player.volume === 0) void player.setVolume(lastAudibleVolume); return;
    case 'sleep': player.setSleepTimer(30); return;
    case 'mood': if (!playMood(command.value)) search(command.value); return;
    case 'playQuery': {
      const query = command.query.toLowerCase();
      const track = tracks.find(item => item.title.toLowerCase() === query) ??
        tracks.find(item => `${item.title} ${item.artist}`.toLowerCase().includes(query));
      if (track) void player.playTrack(track, tracks);
      else search(command.query);
      return;
    }
    case 'search': search(command.query); return;
  }
}
