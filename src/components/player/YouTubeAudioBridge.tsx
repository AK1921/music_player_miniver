// ==============================================================================
// AK YOUTUBE AUDIO BRIDGE COMPONENT
// Persistent headless YouTube IFrame bridge for robust background online playback
// Synchronizes playback, buffering, duration, time update & queue auto-advance
// ==============================================================================

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { usePlayerStore, YouTubeBridgeControls } from '../../stores/playerStore';

const BASE_URL = 'https://musicplayerminiver.vercel.app';

const EMBED_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
      #player { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
      var player = null;
      var isReady = false;
      var pendingVideoId = null;
      var progressInterval = null;

      function sendMsg(type, payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
        }
      }

      function startProgressTracker() {
        stopProgressTracker();
        progressInterval = setInterval(function() {
          if (player && typeof player.getCurrentTime === 'function') {
            try {
              var curr = player.getCurrentTime() || 0;
              var dur = player.getDuration() || 0;
              sendMsg('timeUpdate', { currentTime: curr, duration: dur });
            } catch (_) {}
          }
        }, 500);
      }

      function stopProgressTracker() {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      }

      function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
          width: '100%',
          height: '100%',
          videoId: '',
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            controls: 0,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: '${BASE_URL}'
          },
          events: {
            'onReady': function(event) {
              isReady = true;
              sendMsg('ready');
              if (pendingVideoId) {
                var vid = pendingVideoId;
                pendingVideoId = null;
                execCommand('load', vid);
              }
            },
            'onStateChange': function(event) {
              // YT.PlayerState: -1 = UNSTARTED, 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
              sendMsg('stateChange', { state: event.data });
              if (event.data === 1) {
                startProgressTracker();
              } else if (event.data === 0 || event.data === 2) {
                stopProgressTracker();
              }
            },
            'onError': function(event) {
              sendMsg('error', { code: event.data });
            }
          }
        });
      }

      function execCommand(cmd, arg) {
        if (!player || !isReady) {
          if (cmd === 'load' && arg) {
            pendingVideoId = arg;
          }
          return;
        }
        try {
          if (cmd === 'load') {
            if (player.loadVideoById) {
              player.loadVideoById(arg);
              player.playVideo();
            }
          } else if (cmd === 'play') {
            if (player.playVideo) player.playVideo();
          } else if (cmd === 'pause') {
            if (player.pauseVideo) player.pauseVideo();
          } else if (cmd === 'stop') {
            if (player.stopVideo) player.stopVideo();
            stopProgressTracker();
          } else if (cmd === 'seek') {
            if (player.seekTo) player.seekTo(Number(arg), true);
          }
        } catch(err) {
          sendMsg('execError', { message: err.message });
        }
      }

      window.addEventListener('message', function(e) {
        try {
          var d = JSON.parse(e.data);
          execCommand(d.cmd, d.arg);
        } catch(_) {}
      });
      document.addEventListener('message', function(e) {
        try {
          var d = JSON.parse(e.data);
          execCommand(d.cmd, d.arg);
        } catch(_) {}
      });
    </script>
  </body>
</html>
`;

export const YouTubeAudioBridge: React.FC = () => {
  const webViewRef = useRef<any>(null);
  const registerYouTubeBridge = usePlayerStore(state => state.registerYouTubeBridge);

  const sendCommand = (cmd: string, arg?: any) => {
    if (!webViewRef.current) return;
    const json = JSON.stringify({ cmd, arg });
    const js = `execCommand(${JSON.stringify(cmd)}, ${JSON.stringify(arg)}); true;`;
    webViewRef.current.injectJavaScript(js);
  };

  useEffect(() => {
    const controls: YouTubeBridgeControls = {
      loadVideo: (videoId: string) => {
        sendCommand('load', videoId);
      },
      playVideo: () => {
        sendCommand('play');
      },
      pauseVideo: () => {
        sendCommand('pause');
      },
      stopVideo: () => {
        sendCommand('stop');
      },
      seekTo: (seconds: number) => {
        sendCommand('seek', seconds);
      },
    };

    registerYouTubeBridge(controls);

    return () => {
      registerYouTubeBridge(null);
    };
  }, [registerYouTubeBridge]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const store = usePlayerStore.getState();

      if (data.type === 'stateChange') {
        // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
        if (data.state === 1) {
          usePlayerStore.setState({ isPlaying: true, isBuffering: false });
        } else if (data.state === 2) {
          usePlayerStore.setState({ isPlaying: false, isBuffering: false });
        } else if (data.state === 3) {
          usePlayerStore.setState({ isBuffering: true });
        } else if (data.state === 0) {
          // Track finished -> auto advance queue
          usePlayerStore.setState({ isPlaying: false, isBuffering: false, positionMs: 0 });
          store.playNext();
        }
      } else if (data.type === 'timeUpdate') {
        const posMs = Math.round(Number(data.currentTime || 0) * 1000);
        const durMs = Math.round(Number(data.duration || 0) * 1000);

        usePlayerStore.setState(prev => ({
          positionMs: posMs,
          durationMs: durMs > 0 ? durMs : prev.durationMs,
        }));
      } else if (data.type === 'error') {
        console.log('[YouTube Audio Bridge] Embed notice:', data.code);
        // Code 101/150: Embed restriction notice
        usePlayerStore.setState({ isBuffering: false });
      }
    } catch (_) {}
  };

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.hiddenContainer}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{
          html: EMBED_HTML,
          baseUrl: BASE_URL,
        }}
        style={styles.hiddenWebView}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        androidLayerType="hardware"
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        onMessage={handleMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: -200,
    left: -200,
    width: 2,
    height: 2,
    opacity: 0,
    overflow: 'hidden',
    zIndex: -1,
  },
  hiddenWebView: {
    width: 2,
    height: 2,
  },
});
