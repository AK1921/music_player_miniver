// ==============================================================================
// NEXORA YOUTUBE PLAYER MODAL
// Full-Screen Theater & Floating Picture-in-Picture (PiP) Player
// High-compatibility YouTube video embed with baseUrl and event bridging
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { usePlayerStore } from '../../stores/playerStore';
import { CURATED_YOUTUBE_CATALOG } from '../../services/youtubeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  track: {
    id: string;
    youtubeId?: string;
    title: string;
    artist: string;
    url?: string;
    artwork?: string;
    duration?: number;
  } | null;
  queue?: any[];
  onTrackChange?: (track: any) => void;
}

export const YouTubePlayerModal: React.FC<Props> = ({
  visible,
  onClose,
  track,
  queue = [],
  onTrackChange,
}) => {
  const { theme } = useThemeStore();
  const { createPlaylist, addTrackToPlaylist, playlists } = usePlayerStore();
  const [isPip, setIsPip] = useState(false);
  const [hasPlayerError, setHasPlayerError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  // Automatically pause any active local audio when YouTube starts
  useEffect(() => {
    if (visible && track) {
      setIsLoading(true);
      setHasPlayerError(false);
      setIsPlaying(true);
      try {
        const { isPlaying: localPlaying, sound } = usePlayerStore.getState();
        if (localPlaying && sound) {
          sound.pause();
        }
      } catch (_) {}
    }
  }, [visible, track?.id]);

  if (!visible || !track) return null;

  // Extract valid 11-char YouTube Video ID
  let ytid = track.youtubeId;
  if (!ytid && track.id && track.id.startsWith('yt_') && track.id.length === 14) {
    ytid = track.id.slice(3);
  }
  if (!ytid && track.url) {
    const match = track.url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([A-Za-z0-9_-]{11})/);
    if (match && match[1]) {
      ytid = match[1];
    }
  }

  // Fallback to Curated Catalog if missing or invalid ID format
  if (!ytid || ytid.length !== 11) {
    const catalogItem = CURATED_YOUTUBE_CATALOG.find(
      c => c.id === track.id || c.title?.toLowerCase() === track.title?.toLowerCase()
    );
    if (catalogItem && catalogItem.youtubeId) {
      ytid = catalogItem.youtubeId;
    }
  }

  // Safe fallback to verified playable ID if still unresolvable
  if (!ytid || ytid.length !== 11) {
    ytid = '4NRXx6U8ABQ'; // The Weeknd - Blinding Lights
  }

  // Generate robust HTML document with YouTube IFrame API and baseUrl
  const generateEmbedHtml = (videoId: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { width: 100%; height: 100%; background-color: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
          #player { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        </style>
      </head>
      <body>
        <div id="player"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
          var player;
          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              width: '100%',
              height: '100%',
              videoId: '${videoId}',
              playerVars: {
                autoplay: 1,
                playsinline: 1,
                controls: 1,
                rel: 0,
                showinfo: 0,
                modestbranding: 1,
                fs: 1,
                origin: 'https://www.youtube.com',
                enablejsapi: 1
              },
              events: {
                'onReady': function(event) {
                  try { event.target.playVideo(); } catch(e){}
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
                  }
                },
                'onStateChange': function(event) {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stateChange', state: event.data }));
                  }
                },
                'onError': function(event) {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: event.data }));
                  }
                }
              }
            });
          }

          function execCommand(cmd, arg) {
            if (!player) return;
            try {
              if (cmd === 'play') player.playVideo();
              if (cmd === 'pause') player.pauseVideo();
              if (cmd === 'seekRelative') {
                var curr = player.getCurrentTime() || 0;
                player.seekTo(Math.max(0, curr + arg), true);
              }
            } catch(e) {}
          }

          window.addEventListener('message', function(e) {
            try {
              var d = JSON.parse(e.data);
              execCommand(d.cmd, d.arg);
            } catch(err) {}
          });
          document.addEventListener('message', function(e) {
            try {
              var d = JSON.parse(e.data);
              execCommand(d.cmd, d.arg);
            } catch(err) {}
          });
        </script>
      </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setIsLoading(false);
        setIsPlaying(true);
      } else if (data.type === 'stateChange') {
        // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
        if (data.state === 1) {
          setIsPlaying(true);
          setIsLoading(false);
        } else if (data.state === 2) {
          setIsPlaying(false);
        } else if (data.state === 0) {
          // Video ended -> Autoplay next if queue exists
          handlePlayNext();
        }
      } else if (data.type === 'error') {
        console.warn('[YouTube Player] Embed notice code:', data.error);
        if (data.error === 101 || data.error === 150) {
          setHasPlayerError(true);
        }
      }
    } catch (_) {}
  };

  const sendCommand = (cmd: string, arg: any = 0) => {
    const js = `execCommand("${cmd}", ${arg}); true;`;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      sendCommand('pause');
      setIsPlaying(false);
    } else {
      sendCommand('play');
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds: number) => {
    sendCommand('seekRelative', seconds);
  };

  const handlePlayNext = () => {
    if (!queue || queue.length === 0 || !onTrackChange) return;
    const currentIndex = queue.findIndex(t => (t.youtubeId || t.id) === (track.youtubeId || track.id));
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      onTrackChange(queue[currentIndex + 1]);
    } else if (queue.length > 0) {
      onTrackChange(queue[0]);
    }
  };

  const handlePlayPrevious = () => {
    if (!queue || queue.length === 0 || !onTrackChange) return;
    const currentIndex = queue.findIndex(t => (t.youtubeId || t.id) === (track.youtubeId || track.id));
    if (currentIndex > 0) {
      onTrackChange(queue[currentIndex - 1]);
    } else if (queue.length > 0) {
      onTrackChange(queue[queue.length - 1]);
    }
  };

  const handleClose = () => {
    setIsPip(false);
    setHasPlayerError(false);
    onClose();
  };

  const handleOpenExternal = async () => {
    const appUrl = `vnd.youtube:${ytid}`;
    const webUrl = `https://www.youtube.com/watch?v=${ytid}`;
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      await Linking.openURL(webUrl).catch(() => {
        Alert.alert('Notice', 'Could not open YouTube link.');
      });
    }
  };

  const handleAddToPlaylist = () => {
    if (playlists.length === 0) {
      Alert.prompt
        ? Alert.prompt('Create Playlist', 'Enter playlist name:', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Create & Add',
              onPress: async (name?: string) => {
                if (name?.trim()) {
                  const newId = createPlaylist(name.trim());
                  await addTrackToPlaylist(newId, track.id);
                  Alert.alert('Added', `Track added to "${name.trim()}".`);
                }
              },
            },
          ])
        : Alert.alert('Notice', 'Create a playlist in the Playlists tab to save this track.');
    } else {
      Alert.alert(
        'Add to Playlist',
        `Save "${track.title}" to which playlist?`,
        [
          ...playlists.slice(0, 5).map(pl => ({
            text: pl.name,
            onPress: async () => {
              await addTrackToPlaylist(pl.id, track.id);
              Alert.alert('Saved', `Added to "${pl.name}".`);
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // FLOATING PICTURE-IN-PICTURE (PIP) VIEW
  if (isPip) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.pipBackdrop} pointerEvents="box-none">
          <View style={[styles.pipFloatingBox, { borderColor: theme.border }]}>
            {/* PiP Header */}
            <View style={styles.pipHeader}>
              <Text style={styles.pipTitle} numberOfLines={1}>
                {track.title}
              </Text>
              <View style={styles.pipHeaderActions}>
                {/* Expand Button */}
                <TouchableOpacity
                  onPress={() => setIsPip(false)}
                  style={styles.pipActionBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="scan-outline" size={15} color="#FFF" />
                </TouchableOpacity>

                {/* Direct Close Button: Closes immediately without needing to expand */}
                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.pipActionBtn, styles.pipCloseBtn]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Video Viewport in PiP */}
            <View style={styles.pipVideoViewport}>
              {hasPlayerError ? (
                <TouchableOpacity
                  style={styles.pipErrorFallback}
                  onPress={handleOpenExternal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-youtube" size={24} color="#EF4444" />
                  <Text style={styles.pipErrorText}>Watch on YouTube</Text>
                </TouchableOpacity>
              ) : (
                <WebView
                  ref={webViewRef}
                  originWhitelist={['*']}
                  source={{
                    html: generateEmbedHtml(ytid),
                    baseUrl: 'https://www.youtube.com',
                  }}
                  style={styles.webview}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  allowsFullscreenVideo={true}
                  mixedContentMode="always"
                  androidLayerType="hardware"
                  userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
                  onMessage={handleWebViewMessage}
                  onError={() => setHasPlayerError(true)}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // FULL-SCREEN THEATER VIEW
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        {/* Top Header Bar */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={26} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={[styles.headerBadge, { color: theme.primary }]}>YOUTUBE PLAYER</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {track.title}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* PiP Mini Player Button */}
            <TouchableOpacity
              onPress={() => setIsPip(true)}
              style={styles.toolIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="albums-outline" size={20} color={theme.text} />
            </TouchableOpacity>

            {/* External YouTube Link */}
            <TouchableOpacity onPress={handleOpenExternal} style={styles.ytIconBtn} activeOpacity={0.7}>
              <Ionicons name="logo-youtube" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Video Player Box */}
        <View style={styles.playerContainer}>
          {hasPlayerError ? (
            <View style={styles.errorFallbackContainer}>
              <Ionicons name="logo-youtube" size={48} color="#EF4444" />
              <Text style={[styles.errorFallbackTitle, { color: theme.text }]}>
                Playback Restricted on This Video
              </Text>
              <Text style={[styles.errorFallbackSub, { color: theme.textMuted }]}>
                The video owner requires opening this song directly in the YouTube app.
              </Text>
              <TouchableOpacity
                style={[styles.openYtBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleOpenExternal}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-youtube" size={18} color="#FFF" />
                <Text style={styles.openYtBtnText}>Play in YouTube App</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1, position: 'relative' }}>
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{
                  html: generateEmbedHtml(ytid),
                  baseUrl: 'https://www.youtube.com',
                }}
                style={styles.webview}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsFullscreenVideo={true}
                mixedContentMode="always"
                androidLayerType="hardware"
                userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
                onMessage={handleWebViewMessage}
                onError={() => setHasPlayerError(true)}
              />
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={{ color: '#FFF', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                    Loading YouTube Stream...
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Control Bar: Prev, -10s, Play/Pause, +10s, Next */}
        <View style={[styles.playbackControlsBar, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            onPress={handlePlayPrevious}
            style={styles.ctrlBtn}
            disabled={!queue || queue.length <= 1}
            activeOpacity={0.7}
          >
            <Ionicons
              name="play-skip-back"
              size={22}
              color={queue && queue.length > 1 ? theme.text : theme.textSubtle}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleSeek(-10)} style={styles.ctrlBtn} activeOpacity={0.7}>
            <Ionicons name="play-back" size={20} color={theme.text} />
            <Text style={[styles.seekSecText, { color: theme.textSubtle }]}>-10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTogglePlay}
            style={[styles.mainPlayBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleSeek(10)} style={styles.ctrlBtn} activeOpacity={0.7}>
            <Ionicons name="play-forward" size={20} color={theme.text} />
            <Text style={[styles.seekSecText, { color: theme.textSubtle }]}>+10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePlayNext}
            style={styles.ctrlBtn}
            disabled={!queue || queue.length <= 1}
            activeOpacity={0.7}
          >
            <Ionicons
              name="play-skip-forward"
              size={22}
              color={queue && queue.length > 1 ? theme.text : theme.textSubtle}
            />
          </TouchableOpacity>
        </View>

        {/* Track Details & Actions */}
        <View style={[styles.detailsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.trackTitle, { color: theme.text }]} numberOfLines={2}>
            {track.title}
          </Text>
          <Text style={[styles.trackArtist, { color: theme.textMuted }]} numberOfLines={1}>
            {track.artist || 'YouTube Music'}
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleAddToPlaylist}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.actionBtnText, { color: theme.text }]}>Playlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setIsPip(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="albums-outline" size={18} color={theme.primary} />
              <Text style={[styles.actionBtnText, { color: theme.text }]}>PiP Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleOpenExternal}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={18} color={theme.accent} />
              <Text style={[styles.actionBtnText, { color: theme.text }]}>YouTube</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nowPlayingHint}>
            <Ionicons name="information-circle-outline" size={14} color={theme.textSubtle} />
            <Text style={[styles.hintText, { color: theme.textSubtle }]}>
              Supports background playback, PiP floating player, and playlist autoplay
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 36,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeBtn: {
    padding: 6,
    marginRight: 8,
  },
  toolIconBtn: {
    padding: 6,
  },
  headerInfo: {
    flex: 1,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  ytIconBtn: {
    padding: 6,
    marginLeft: 4,
  },
  playerContainer: {
    width: SCREEN_WIDTH,
    height: (SCREEN_WIDTH * 9) / 16,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playbackControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  ctrlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  seekSecText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  mainPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  detailsCard: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  trackTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nowPlayingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  hintText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Floating PiP Styles
  pipBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  pipFloatingBox: {
    position: 'absolute',
    bottom: 84,
    right: 16,
    width: 220,
    height: 146,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0B0E17',
    borderWidth: 1.5,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  pipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#111522',
  },
  pipTitle: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 130,
  },
  pipHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pipActionBtn: {
    padding: 3,
    borderRadius: 4,
  },
  pipCloseBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipVideoViewport: {
    flex: 1,
    backgroundColor: '#000',
  },
  pipErrorFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111522',
  },
  pipErrorText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },

  // Fullscreen Error Fallback Styles
  errorFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0B0E17',
  },
  errorFallbackTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  errorFallbackSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    maxWidth: 280,
  },
  openYtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  openYtBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
