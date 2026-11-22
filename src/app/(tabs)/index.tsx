// ==============================================================================
// AK APP - MAIN DASHBOARD
// Clean, modern, minimalist media hub with quick access to Music, Files, Vault & Games
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useMediaStore } from '../../stores/mediaStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useVaultStore } from '../../stores/vaultStore';
import { CameraCaptureModal } from '../../components/camera/CameraCaptureModal';
import { MediaViewerModal } from '../../components/viewers/MediaViewerModal';
import { MediaFile } from '../../types';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { files, getStorageAnalytics, fetchMedia } = useMediaStore();
  const { currentTrack, isPlaying } = usePlayerStore();
  const { isLocked: isVaultLocked, vaultItems } = useVaultStore();

  const [cameraVisible, setCameraVisible] = useState(false);
  const [selectedFileForViewer, setSelectedFileForViewer] = useState<MediaFile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Equalizer Wave Animations for Dashboard Player
  const wave1 = useAnimatedValue(4);
  const wave2 = useAnimatedValue(8);
  const wave3 = useAnimatedValue(6);

  // Entrance animation for the Now Playing card (slide-up + fade)
  const cardSlide = useAnimatedValue(30);
  const cardFade = useAnimatedValue(0);

  useEffect(() => {
    if (currentTrack && isPlaying) {
      cardSlide.setValue(30);
      cardFade.setValue(0);
      Animated.parallel([
        Animated.timing(cardSlide, { toValue: 0, duration: 380, useNativeDriver: false }),
        Animated.timing(cardFade, { toValue: 1, duration: 380, useNativeDriver: false }),
      ]).start();
    }
  }, [currentTrack?.id, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const a1 = Animated.loop(
        Animated.sequence([
          Animated.timing(wave1, { toValue: 14, duration: 260, useNativeDriver: false }),
          Animated.timing(wave1, { toValue: 4, duration: 260, useNativeDriver: false }),
        ])
      );
      const a2 = Animated.loop(
        Animated.sequence([
          Animated.timing(wave2, { toValue: 16, duration: 320, useNativeDriver: false }),
          Animated.timing(wave2, { toValue: 5, duration: 320, useNativeDriver: false }),
        ])
      );
      const a3 = Animated.loop(
        Animated.sequence([
          Animated.timing(wave3, { toValue: 12, duration: 280, useNativeDriver: false }),
          Animated.timing(wave3, { toValue: 4, duration: 280, useNativeDriver: false }),
        ])
      );
      a1.start();
      a2.start();
      a3.start();
      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
      };
    } else {
      wave1.setValue(4);
      wave2.setValue(4);
      wave3.setValue(4);
    }
  }, [isPlaying]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedia();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const analytics = getStorageAnalytics();
  const recentFiles = files.filter(f => !f.isDeleted).slice(0, 8);

  const formatBytes = (bytes: number) => {
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.brandRow}>
          <View style={[styles.logoBadge, { overflow: 'hidden', backgroundColor: theme.primary }]}>
            <Image
              source={require('../../../assets/ak-logo.png')}
              style={{ width: '100%', height: '100%', borderRadius: 12 }}
              resizeMode="cover"
            />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: theme.text }]}>AK</Text>
            <Text style={[styles.brandSubtitle, { color: theme.textSubtle }]}>
              {user?.fullName ? `Hi, ${user.fullName.split(' ')[0]}` : 'Personal Cloud'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setCameraVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={20} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/auth')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Modern Clean Storage Card */}
        <View style={[styles.storageCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.storageTopRow}>
            <View>
              <Text style={[styles.storageLabel, { color: theme.textMuted }]}>CLOUD STORAGE</Text>
              <Text style={[styles.storageValue, { color: theme.text }]}>
                {formatBytes(analytics.totalBytes)}{' '}
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSubtle }}>
                  / {formatBytes(analytics.limitBytes)}
                </Text>
              </Text>
            </View>
            <View style={[styles.storagePctBadge, { backgroundColor: theme.primaryGlow }]}>
              <Text style={[styles.storagePctText, { color: theme.primary }]}>
                {analytics.usedPercentage}% USED
              </Text>
            </View>
          </View>

          {/* Slim Progress Bar */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.card }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.max(6, analytics.usedPercentage)}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>

          {/* Clean Quick Metric Counters */}
          <View style={styles.metricRow}>
            <Text style={[styles.metricText, { color: theme.textSubtle }]}>
              📸 {analytics.byType.images.count} Photos
            </Text>
            <Text style={[styles.metricDot, { color: theme.border }]}>•</Text>
            <Text style={[styles.metricText, { color: theme.textSubtle }]}>
              🎬 {analytics.byType.videos.count} Videos
            </Text>
            <Text style={[styles.metricDot, { color: theme.border }]}>•</Text>
            <Text style={[styles.metricText, { color: theme.textSubtle }]}>
              🎧 {analytics.byType.audio.count} Tracks
            </Text>
          </View>
        </View>

        {/* 4 Core Features (Clean, Spacious 2x2 Grid) */}
        <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>HUB</Text>
        <View style={styles.featureGrid}>
          {/* 1. Music Player */}
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/music')}
            activeOpacity={0.8}
          >
            <View style={[styles.featureIconCircle, { backgroundColor: theme.primaryGlow }]}>
              <Ionicons name="headset" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Music</Text>
            <Text style={[styles.featureSub, { color: theme.textSubtle }]}>
              {isPlaying ? 'Now Streaming ♪' : `${analytics.byType.audio.count} ${analytics.byType.audio.count === 1 ? 'track' : 'tracks'}`}
            </Text>
          </TouchableOpacity>

          {/* 2. File Explorer */}
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/files')}
            activeOpacity={0.8}
          >
            <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <Ionicons name="folder-open" size={24} color={theme.accent} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Files</Text>
            <Text style={[styles.featureSub, { color: theme.textSubtle }]}>
              {files.filter(f => f.fileType !== 'audio' && !f.isDeleted).length} docs & media
            </Text>
          </TouchableOpacity>

          {/* 3. Private Vault */}
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/vault')}
            activeOpacity={0.8}
          >
            <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Ionicons name="shield-checkmark" size={24} color={theme.secondary} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Vault</Text>
            <Text style={[styles.featureSub, { color: theme.textSubtle }]}>
              {isVaultLocked ? 'Locked • AES-256' : `${vaultItems.length} items decrypted`}
            </Text>
          </TouchableOpacity>

          {/* 4. Mini-Games */}
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push('/games')}
            activeOpacity={0.8}
          >
            <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="game-controller" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Games</Text>
            <Text style={[styles.featureSub, { color: theme.textSubtle }]}>
              8 Arcade Games
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Media Feed */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: theme.textSubtle, marginBottom: 0 }]}>
              RECENT MEDIA
            </Text>
            <TouchableOpacity onPress={() => router.push('/files')}>
              <Text style={[styles.seeAllBtn, { color: theme.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentFiles.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="images-outline" size={32} color={theme.textSubtle} />
              <Text style={[styles.emptyBoxText, { color: theme.textMuted }]}>No media uploaded yet</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {recentFiles.map(file => (
                <TouchableOpacity
                  key={file.id}
                  style={[styles.recentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setSelectedFileForViewer(file)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.recentThumbBox, { backgroundColor: theme.surface }]}>
                    {(file.thumbnailPath || file.fileType === 'image') ? (
                      <Image
                        source={{ uri: file.thumbnailPath || file.uri || file.storagePath }}
                        style={styles.recentThumbImg}
                      />
                    ) : (
                      <Ionicons
                        name={
                          file.fileType === 'video'
                            ? 'film'
                            : file.fileType === 'audio'
                            ? 'musical-notes'
                            : 'document-text'
                        }
                        size={32}
                        color={theme.primary}
                      />
                    )}
                  </View>
                  <Text style={[styles.recentName, { color: theme.text }]} numberOfLines={1}>
                    {file.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Now Playing Card - ONLY SHOWS WHEN MUSIC IS ACTUALLY PLAYING */}
        {currentTrack && isPlaying && (
          <Animated.View
            style={[
              styles.nowPlayingCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primary,
                shadowColor: theme.primary,
                opacity: cardFade,
                transform: [{ translateY: cardSlide }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.nowPlayingInfoTouch}
              onPress={() => router.push('/music')}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri:
                    currentTrack.artwork ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200',
                }}
                style={styles.nowPlayingArt}
              />
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.nowPlayingTitle, { color: theme.text }]} numberOfLines={1}>
                    {currentTrack.title}
                  </Text>
                  <View style={styles.dashboardWaveRow}>
                    <Animated.View
                      style={[styles.dashboardWaveBar, { height: wave1, backgroundColor: theme.primary }]}
                    />
                    <Animated.View
                      style={[styles.dashboardWaveBar, { height: wave2, backgroundColor: theme.accent }]}
                    />
                    <Animated.View
                      style={[styles.dashboardWaveBar, { height: wave3, backgroundColor: theme.secondary }]}
                    />
                  </View>
                </View>
                <Text style={[styles.nowPlayingArtist, { color: theme.textMuted }]} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* Modals */}
      <CameraCaptureModal visible={cameraVisible} onClose={() => setCameraVisible(false)} />
      <MediaViewerModal file={selectedFileForViewer} onClose={() => setSelectedFileForViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { maxWidth: 560, width: '100%', alignSelf: 'center' } : {}),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
  },
  storageCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  storageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storageLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  storageValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  storagePctBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  storagePctText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricDot: {
    fontSize: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  featureSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllBtn: {
    fontSize: 12,
    fontWeight: '700',
  },
  hScroll: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
  },
  recentCard: {
    width: 124,
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    marginRight: 10,
  },
  recentThumbBox: {
    width: '100%',
    height: 94,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  recentThumbImg: {
    width: '100%',
    height: '100%',
  },
  recentName: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyBoxText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    marginTop: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  nowPlayingInfoTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  nowPlayingArt: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  nowPlayingTitle: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  nowPlayingArtist: {
    fontSize: 11,
    marginTop: 2,
  },
  dashboardWaveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
  },
  dashboardWaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  playToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
});
