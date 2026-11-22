export function parseMusicCommand(raw: string):
  | { action: 'empty' | 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'up' | 'down' | 'top' | 'bottom' | 'louder' | 'quieter' | 'mute' | 'unmute' | 'sleep' }
  | { action: 'volume'; value: number }
  | { action: 'mood'; value: string }
  | { action: 'search' | 'playQuery'; query: string };
