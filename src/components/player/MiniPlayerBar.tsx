// ==============================================================================
// AK MINI PLAYER BAR
// Persistent floating media control bar with large pause button & reliable controls
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { usePlayerStore } from '../../stores/playerStore';

export const MiniPlayerBar: React.FC = () => {
  const { theme } = useThemeStore();
  const {
    currentTrack,
    isPlaying,
    positionMs,
    durationMs,
    togglePlayPause,
    playNext,
    stopAndDismiss,
    setExpandedNowPlaying,
  } = usePlayerStore();

  const [wave1] = useState(() => new Animated.Value(4));
  const [wave2] = useState(() => new Animated.Value(8));
  const [wave3] = useState(() => new Animated.Value(6));

  useEffect(() => {
    if (isPlaying) {
      const anim1 = Animated.loop(
        Animated.sequence([
          Animated.timing(wave1, { toValue: 16, duration: 250, useNativeDriver: false }),
          Animated.timing(wave1, { toValue: 4, duration: 250, useNativeDriver: false }),
        ])
      );
      const anim2 = Animated.loop(
        Animated.sequence([
          Animated.timing(wave2, { toValue: 18, duration: 320, useNativeDriver: false }),
          Animated.timing(wave2, { toValue: 6, duration: 320, useNativeDriver: false }),
        ])
      );
      const anim3 = Animated.loop(
        Animated.sequence([
          Animated.timing(wave3, { toValue: 14, duration: 280, useNativeDriver: false }),
          Animated.timing(wave3, { toValue: 4, duration: 280, useNativeDriver: false }),
        ])
      );
      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
      };
    } else {
      wave1.setValue(4);
      wave2.setValue(4);
      wave3.setValue(4);
    }
  }, [isPlaying]);

  if (!currentTrack) return null;

  const progress = durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;

  return (
    <View style={styles.wrapper}>
      {/* Container is a View to prevent touch-event interception */}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: isPlaying ? theme.primary : theme.border,
            shadowColor: theme.primary,
          },
        ]}
      >
        {/* Progress Line */}
        <View style={styles.progressBarWrapper}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress * 100}%`, backgroundColor: theme.primary },
            ]}
          />
        </View>

        <View style={styles.contentRow}>
          {/* Left area: Tap to open Now Playing */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setExpandedNowPlaying(true)}
            style={styles.infoTouchArea}
          >
            <Image
              source={{
                uri:
                  currentTrack.artwork ||
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
              }}
              style={styles.thumbnail}
            />

            <View style={styles.infoCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                {/* Live sound wave bars */}
                {isPlaying && (
                  <View style={styles.liveWaveContainer}>
                    <Animated.View style={[styles.waveBar, { height: wave1, backgroundColor: theme.primary }]} />
                    <Animated.View style={[styles.waveBar, { height: wave2, backgroundColor: theme.accent }]} />
                    <Animated.View style={[styles.waveBar, { height: wave3, backgroundColor: theme.secondary }]} />
                  </View>
                )}
              </View>
              <Text style={[styles.artist, { color: theme.textMuted }]} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right area: BIG dedicated Play/Pause button + Controls */}
          <View style={styles.actionsRow}>
            {/* BIG Prominent Pause/Play Button */}
            <TouchableOpacity
              onPress={togglePlayPause}
              activeOpacity={0.75}
              style={[
                styles.bigPlayBtn,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                },
              ]}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={26}
                color="#FFF"
                style={{ marginLeft: isPlaying ? 0 : 2 }}
              />
            </TouchableOpacity>

            {/* Next Track */}
            <TouchableOpacity onPress={playNext} style={styles.controlBtn} activeOpacity={0.7}>
              <Ionicons name="play-forward" size={20} color={theme.text} />
            </TouchableOpacity>

            {/* Close / Dismiss */}
            <TouchableOpacity onPress={stopAndDismiss} style={styles.controlBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  container: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    minHeight: 72,
  },
  progressBarWrapper: {
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressBar: {
    height: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  infoTouchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  infoCol: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  artist: {
    fontSize: 11,
    marginTop: 2,
  },
  liveWaveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 18,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bigPlayBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
