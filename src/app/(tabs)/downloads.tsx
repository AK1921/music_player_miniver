// ==============================================================================
// AK DOWNLOADS TAB - Downloaded Music Player with Instant Play/Stop
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useMediaStore } from '../../stores/mediaStore';
import { Track } from '../../types';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import { StorageService } from '../../services/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Cover image URL helper - ensures consistent small thumbnail size
const getCoverUrl = (url?: string, fallback = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400') => {
  if (!url) return fallback;
  // Use YouTube's default thumbnail size (320x180) or force a specific size
  if (url.includes('youtube.com') || url.includes('ytimg.com')) {
    return url.replace('hqdefault.jpg', 'mqdefault.jpg'); // Smaller 160x90 thumbnail
  }
  // For other URLs, append small size parameter where possible
  if (url.includes('unsplash.com')) {
    return url + '&w=180&h=180&fit=crop';
  }
  return url;
};

export default function DownloadsScreen() {
  const { theme } = useThemeStore();
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    playTrack,
  } = usePlayerStore();
  const {
    files,
    fetchMedia,
  } = useMediaStore();

  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useAnimatedValue(1);

  // Animated flip effect for play/pause button
  const flipAnim = new Animated.Value(0);
  const rotateX = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  useEffect(() => {
    // Fade animation for tab content
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [favoritesOnly]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedia();
    setRefreshing(false);
  };

  const handleDownloadAudio = async (track: Track) => {
    // Check if already downloaded
    const alreadyDownloaded = files.some(
      f => !f.isDeleted && f.name.toLowerCase().includes(track.title.toLowerCase())
    );
    if (alreadyDownloaded) {
      Alert.alert('Already Downloaded', `"${track.title}" is already in your library!`);
      return;
    }
    try {
      const res = await StorageService.uploadFile({
        bucket: 'media-files',
        path: `${track.title}.mp3`,
        uri: track.url,
        mimeType: 'audio/mpeg',
      });
      Alert.alert('Downloaded', `"${track.title}" has been saved to your offline music library!`);
    } catch (e: any) {
      Alert.alert('Download Notice', e?.message || 'Could not download song.');
    }
  };

  // Get downloaded audio files (audio files in the library)
  const downloadedTracks: Track[] = files
    .filter(f => f.fileType === 'audio' && !f.isDeleted && (!f.isFavourite || !favoritesOnly))
    .map(f => ({
      id: f.id,
      url: f.uri || f.storagePath,
      title: f.title || f.name.replace(/\.[^/.]+$/, ''),
      artist: f.artist || 'Downloaded Track',
      album: f.album || 'AK Music',
      artwork: getCoverUrl(f.thumbnailPath || f.uri),
      duration: f.durationSeconds ? f.durationSeconds * 1000 : 180000, // default 3 min
    }));

  // Add favorites filter
  const displayTracks = favoritesOnly
    ? files.filter(f => f.fileType === 'audio' && !f.isDeleted && f.isFavourite)
        .map(f => ({
          id: f.id,
          url: f.uri || f.storagePath,
          title: f.title || f.name.replace(/\.[^/.]+$/, ''),
          artist: f.artist || 'Downloaded Track',
          album: f.album || 'AK Music',
          artwork: getCoverUrl(f.thumbnailPath || f.uri),
          duration: f.durationSeconds ? f.durationSeconds * 1000 : 180000,
        }))
    : downloadedTracks;

  const handlePlayPause = (track: Track) => {
    if (currentTrack?.id === track.id) {
      // Instant pause/resume
      Animated.timing(flipAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start(() => {
        flipAnim.setValue(0);
      });
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  const formatTime = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: theme.surface, opacity: fadeAnim }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>DOWNLOADS</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.filterBtn, { backgroundColor: favoritesOnly ? theme.primary : theme.card, borderColor: favoritesOnly ? theme.primary : theme.border }]}
              onPress={() => setFavoritesOnly(!favoritesOnly)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={favoritesOnly ? 'heart' : 'heart-outline'}
                size={16}
                color={favoritesOnly ? '#FFF' : theme.textMuted}
              />
              <Text style={{ fontSize: 11, fontWeight: '700', color: favoritesOnly ? '#FFF' : theme.textMuted }}>
                {favoritesOnly ? 'FAVORITES' : 'ALL'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {displayTracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="download-outline" size={54} color={theme.textSubtle} />
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>
                {favoritesOnly ? 'No Favorite Downloads' : 'No Downloads Yet'}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {favoritesOnly
                  ? 'Add tracks to your favorites and they will appear here.'
                  : 'Download songs from the Music tab to build your offline library.'
                }
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 20 }]}
                onPress={() => {}}>
                <Ionicons name="musical-notes" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>EXPLORE MUSIC</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.trackList}>
              {displayTracks.map((track, idx) => {
                const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <Animated.View
                    key={track.id}
                    style={[
                      styles.trackRow,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      isCurrentPlaying && { backgroundColor: theme.primaryGlow, borderColor: theme.primary },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.trackContent}
                      onPress={() => handlePlayPause(track)}
                      activeOpacity={0.8}
                    >
                      {/* Album Art - Small & Consistent Size */}
                      <View style={styles.albumArtBox}>
                        <Image
                          source={{ uri: track.artwork }}
                          style={styles.albumArt}
                          resizeMode="cover"
                        />
                        {isCurrentPlaying && (
                          <View style={styles.playingBadge}>
                            <Ionicons name="volume-high" size={12} color={theme.primary} />
                          </View>
                        )}
                      </View>

                      <View style={styles.trackInfo}>
                        <Text
                          style={[styles.trackTitle, { color: isCurrentPlaying ? theme.primary : theme.text }]}
                          numberOfLines={1}
                        >
                          {track.title}
                        </Text>
                        <Text style={[styles.trackArtist, { color: theme.textMuted }]} numberOfLines={1}>
                          {track.artist}
                        </Text>
                      </View>

                      {/* Play/Pause Button with Instant Response */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePlayPause(track);
                        }}
                        style={styles.playBtn}
                        activeOpacity={0.7}
                      >
                        {isCurrentPlaying ? (
                          <Animated.View style={{ transform: [{ rotateX: rotateX }] }}>
                            <Ionicons name="pause" size={24} color={theme.primary} />
                          </Animated.View>
                        ) : (
                          <Ionicons name="play" size={24} color={theme.text} />
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {/* Duration */}
                    <Text style={[styles.trackDuration, { color: theme.textMuted }]}>
                      {formatTime(track.duration || 180000)}
                    </Text>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 16,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  trackList: {
    gap: 8,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    backgroundColor: '#1E293B',
  },
  trackContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  albumArtBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#334155',
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  playingBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  trackArtist: {
    fontSize: 11,
    marginTop: 2,
  },
  playBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackDuration: {
    fontSize: 11,
    marginLeft: 8,
  },
});