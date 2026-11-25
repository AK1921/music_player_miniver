// ==============================================================================
// AK FULL-SCREEN NOW PLAYING INTERFACE
// High-fidelity music player with vinyl spin animation, huge pause button,
// reactive equalizer visualizer, and custom artwork upload
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useThemeStore } from '../../stores/themeStore';
import { usePlayerStore } from '../../stores/playerStore';
import { pickMediaFromLibrary } from '../../services/mediaPicker';
import { YouTubePlayerModal } from '../viewers/YouTubePlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function NowPlayingVideoView({ uri, isPlaying }: { uri: string; isPlaying: boolean }) {
  const player = useVideoPlayer(uri, video => {
    video.loop = true;
    video.muted = true;
  });

  useEffect(() => {
    if (isPlaying) player.play();
    else player.pause();
  }, [isPlaying, player]);

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="contain"
      nativeControls={false}
      allowsPictureInPicture={false}
      startsPictureInPictureAutomatically={false}
    />
  );
}

export const NowPlayingModal: React.FC = () => {
  const { theme } = useThemeStore();
  const {
    currentTrack,
    isPlaying,
    positionMs,
    durationMs,
    volume,
    setVolume,
    isShuffle,
    repeatMode,
    queue,
    visualizerBars,
    isExpandedNowPlaying,
    setExpandedNowPlaying,
    playTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
    updateTrackArtwork,
    deleteTrack,
    sleepTimerMode,
    sleepTimerMinutesRemaining,
    setSleepTimer,
    cancelSleepTimer,
    equalizerPreset,
    equalizerBass,
    equalizerMid,
    equalizerTreble,
    setEqualizerPreset,
    setEqualizerBand,
    currentLyrics,
    isLyricsLoading,
  } = usePlayerStore();

  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [ytPlayerVisible, setYtPlayerVisible] = useState(false);

  // Auto-scroll ref for synchronized lyrics
  const lyricsScrollRef = useRef<any>(null);

  // Animations - Smooth ambient pulse for big rectangular cover art
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (isPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
      };
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying, pulseAnim]);

  if (!currentTrack) return null;

  const handleDeleteCurrentTrack = () => {
    if (!currentTrack) return;
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${currentTrack.title}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Song',
          style: 'destructive',
          onPress: async () => {
            deleteTrack(currentTrack.id);
            Alert.alert('Song Deleted', `"${currentTrack.title}" has been deleted.`);
          },
        },
      ]
    );
  };

  const isVideoTrack = /\.(?:mp4|mov|webm|mkv)$/i.test(currentTrack.url?.split(/[?#]/, 1)[0] ?? '');

  const progress = durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;

  const formatTime = (millis: number) => {
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeekPress = (e: any) => {
    const { locationX } = e.nativeEvent;
    const barWidth = SCREEN_WIDTH - 64;
    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    seekTo(ratio * durationMs);
  };

  const handleChangeArtwork = async () => {
    try {
      const picked = await pickMediaFromLibrary('images');
      if (picked) {
        await updateTrackArtwork(currentTrack.id, picked.uri);
        Alert.alert('Artwork Updated', `New cover image applied to "${currentTrack.title}".`);
      }
    } catch (err: any) {
      Alert.alert('Artwork Error', err?.message || 'Could not select image');
    }
  };

  return (
    <Modal
      visible={isExpandedNowPlaying}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setExpandedNowPlaying(false)}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.card }]}
            onPress={() => setExpandedNowPlaying(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={26} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>AK AUDIO ENGINE</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {currentTrack.album || 'AK Beats'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Sleep Timer Button */}
            <TouchableOpacity
              style={[
                styles.headerBtn,
                { backgroundColor: sleepTimerMode ? theme.primary : theme.card },
              ]}
              onPress={() => setShowSleepTimer(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="moon-outline"
                size={17}
                color={sleepTimerMode ? '#FFF' : theme.text}
              />
              {sleepTimerMinutesRemaining !== null && (
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#FFF', position: 'absolute', top: 1, right: 1 }}>
                  {sleepTimerMinutesRemaining}m
                </Text>
              )}
            </TouchableOpacity>

            {/* Equalizer Button */}
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.card }]}
              onPress={() => setShowEqualizer(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="options-outline" size={17} color={theme.text} />
            </TouchableOpacity>

            {/* Synchronized Lyrics Button */}
            <TouchableOpacity
              style={[
                styles.headerBtn,
                { backgroundColor: showLyrics ? theme.primary : theme.card },
              ]}
              onPress={() => {
                setShowLyrics(!showLyrics);
                setShowQueue(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chatbox-ellipses-outline"
                size={17}
                color={showLyrics ? '#FFF' : theme.text}
              />
            </TouchableOpacity>

            {/* Delete current track */}
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.card }]}
              onPress={handleDeleteCurrentTrack}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={17} color={theme.danger || '#EF4444'} />
            </TouchableOpacity>

            {/* Queue Toggle */}
            <TouchableOpacity
              style={[
                styles.headerBtn,
                { backgroundColor: showQueue ? theme.primary : theme.card },
              ]}
              onPress={() => {
                setShowQueue(!showQueue);
                setShowLyrics(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showQueue ? 'disc' : 'list'}
                size={19}
                color={showQueue ? '#FFF' : theme.text}
              />
            </TouchableOpacity>

            {/* Watch YouTube Video Button if this is an online track */}
            {Boolean(currentTrack.youtubeId) && (
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => setYtPlayerVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-youtube" size={17} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showQueue ? (
          /* Queue Drawer */
          <View style={styles.queueContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={[styles.queueHeading, { color: theme.text }]}>NOW PLAYING QUEUE</Text>
              <TouchableOpacity onPress={() => setShowQueue(false)} style={[styles.headerBtn, { backgroundColor: theme.card }]}>
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {queue.map((track, i) => {
                const isSelected = track.id === currentTrack.id;
                return (
                  <TouchableOpacity
                    key={`q-${track.id}-${i}`}
                    style={[
                      styles.queueItem,
                      {
                        backgroundColor: isSelected ? theme.primaryGlow : theme.card,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => usePlayerStore.getState().playTrack(track)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri:
                          track.artwork ||
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
                      }}
                      style={styles.queueThumb}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={[
                          styles.queueTitle,
                          { color: isSelected ? theme.primary : theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {track.title}
                      </Text>
                      <Text style={[styles.queueArtist, { color: theme.textMuted }]} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isSelected && (
                        <Ionicons name="volume-high" size={20} color={theme.primary} />
                      )}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert('Delete Song', `Delete "${track.title}" from your library?`, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteTrack(track.id),
                            },
                          ]);
                        }}
                        style={{ padding: 6 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.danger || '#EF4444'} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : showLyrics ? (
          /* Synchronized Karaoke Lyrics View */
          <View style={styles.queueContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={[styles.queueHeading, { color: theme.text, marginBottom: 2 }]}>SYNCHRONIZED LYRICS</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>Powered by LRCLIB API • Tap line to seek</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLyrics(false)}
                style={[styles.headerBtn, { backgroundColor: theme.card }]}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView ref={lyricsScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              {currentLyrics && currentLyrics.length > 0 ? (
                currentLyrics.map((line, idx) => {
                  const currentSec = Math.floor(positionMs / 1000);
                  const isActive = currentSec >= line.time && (idx === currentLyrics.length - 1 || currentSec < currentLyrics[idx + 1].time);
                  return (
                    <TouchableOpacity
                      key={`lyric-${idx}`}
                      onPress={() => seekTo(line.time * 1000)}
                      activeOpacity={0.7}
                      style={[
                        styles.lyricLineItem,
                        {
                          backgroundColor: isActive ? theme.primaryGlow : 'transparent',
                          borderColor: isActive ? theme.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.lyricTimeTag,
                          { color: isActive ? theme.primary : theme.textSubtle },
                        ]}
                      >
                        {formatTime(line.time * 1000)}
                      </Text>
                      <Text
                        style={[
                          styles.lyricLineText,
                          {
                            color: isActive ? theme.primary : theme.textMuted,
                            fontWeight: isActive ? '900' : '500',
                            fontSize: isActive ? 18 : 15,
                          },
                        ]}
                      >
                        {line.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Ionicons name="chatbox-ellipses-outline" size={40} color={theme.textSubtle} />
                  <Text style={{ color: theme.textMuted, marginTop: 10, fontSize: 14 }}>
                    {isLyricsLoading ? 'Fetching timed lyrics...' : 'No synchronized lyrics available.'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.mainScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Big Rectangular Album Artwork / Video Frame with Ambient Glow */}
            <View style={styles.rectArtworkContainer}>
              <Animated.View
                style={[
                  styles.rectArtworkGlow,
                  {
                    shadowColor: theme.primary,
                    backgroundColor: theme.primaryGlow,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />

              <View
                style={[
                  styles.rectArtworkCard,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                {isVideoTrack ? (
                  <NowPlayingVideoView key={currentTrack.url} uri={currentTrack.url} isPlaying={isPlaying} />
                ) : (
                  <Image
                    source={{
                      uri:
                        currentTrack.artwork ||
                        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
                    }}
                    style={styles.rectArtworkImage}
                    resizeMode="cover"
                  />
                )}

                {/* Media Type Badge */}
                <View style={[styles.mediaBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                  <Ionicons name={isVideoTrack ? 'videocam' : 'musical-notes'} size={12} color={theme.primary} />
                  <Text style={[styles.mediaBadgeText, { color: '#FFF' }]}>
                    {isVideoTrack ? 'VIDEO PLAYBACK' : 'HD AUDIO'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Change Cover Artwork Button */}
            {!isVideoTrack && (
              <TouchableOpacity
                style={[styles.changeArtBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleChangeArtwork}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={16} color={theme.primary} />
                <Text style={[styles.changeArtText, { color: theme.primary }]}>CHANGE COVER IMAGE</Text>
              </TouchableOpacity>
            )}

            {/* Reactive Dynamic Audio Visualizer */}
            <View style={styles.visualizerContainer}>
              {visualizerBars.map((height, idx) => (
                <View
                  key={`bar-${idx}`}
                  style={[
                    styles.vBar,
                    {
                      height: isPlaying ? Math.max(6, height * 0.45) : 4,
                      backgroundColor: idx % 2 === 0 ? theme.primary : theme.accent,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Track Info */}
            <View style={styles.trackInfo}>
              <View style={styles.textContainer}>
                <Text style={[styles.trackTitle, { color: theme.text }]} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text style={[styles.trackArtist, { color: theme.textMuted }]} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
              </View>
              <TouchableOpacity style={styles.likeBtn} activeOpacity={0.7}>
                <Ionicons name="heart" size={28} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {/* Scrub Slider Bar */}
            <View style={styles.scrubContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleSeekPress}
                style={[styles.progressBarBg, { backgroundColor: theme.card }]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </TouchableOpacity>
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: theme.textSubtle }]}>
                  {formatTime(positionMs)}
                </Text>
                <Text style={[styles.timeText, { color: theme.textSubtle }]}>
                  {formatTime(durationMs)}
                </Text>
              </View>
            </View>

            {/* High Volume & Loudness Booster Bar */}
            <View style={[styles.volumeSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                onPress={() => setVolume(volume > 0 ? 0 : 1.0)}
                style={styles.volumeIconBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={volume === 0 ? 'volume-mute' : volume > 0.6 ? 'volume-high' : 'volume-low'}
                  size={20}
                  color={volume >= 0.8 ? theme.primary : theme.textMuted}
                />
              </TouchableOpacity>

              {/* Interactive Volume Bar */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  const barWidth = SCREEN_WIDTH - 180;
                  const newVol = Math.max(0.05, Math.min(1.0, locationX / barWidth));
                  setVolume(newVol);
                }}
                style={[styles.volumeBarBg, { backgroundColor: theme.surface }]}
              >
                <View
                  style={[
                    styles.volumeBarFill,
                    {
                      width: `${Math.round(volume * 100)}%`,
                      backgroundColor: volume >= 0.9 ? '#10B981' : theme.primary,
                    },
                  ]}
                />
              </TouchableOpacity>

              <Text style={[styles.volumePercentText, { color: theme.text }]}>
                {Math.round(volume * 100)}%
              </Text>

              {/* High Volume Max Boost Button */}
              <TouchableOpacity
                onPress={() => setVolume(1.0)}
                style={[
                  styles.boostBtn,
                  {
                    backgroundColor: volume >= 0.95 ? theme.primary : theme.surface,
                    borderColor: theme.primary,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons name="flame" size={13} color={volume >= 0.95 ? '#FFF' : theme.primary} />
                <Text
                  style={[
                    styles.boostBtnText,
                    { color: volume >= 0.95 ? '#FFF' : theme.primary },
                  ]}
                >
                  HIGH
                </Text>
              </TouchableOpacity>
            </View>

            {/* Playback Controls with HUGE Prominent Pause Button */}
            <View style={styles.controlsRow}>
              {/* Shuffle */}
              <TouchableOpacity onPress={toggleShuffle} style={styles.sideCtrlBtn} activeOpacity={0.7}>
                <Ionicons
                  name="shuffle"
                  size={24}
                  color={isShuffle ? theme.primary : theme.textMuted}
                />
              </TouchableOpacity>

              {/* Prev */}
              <TouchableOpacity onPress={playPrevious} style={styles.navCtrlBtn} activeOpacity={0.7}>
                <Ionicons name="play-skip-back" size={32} color={theme.text} />
              </TouchableOpacity>

              {/* HUGE Center Play/Pause Button */}
              <TouchableOpacity
                onPress={togglePlayPause}
                activeOpacity={0.8}
                style={[
                  styles.hugePlayPauseBtn,
                  {
                    backgroundColor: theme.primary,
                    shadowColor: theme.primary,
                  },
                ]}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={42}
                  color="#FFF"
                  style={{ marginLeft: isPlaying ? 0 : 4 }}
                />
              </TouchableOpacity>

              {/* Next */}
              <TouchableOpacity onPress={playNext} style={styles.navCtrlBtn} activeOpacity={0.7}>
                <Ionicons name="play-skip-forward" size={32} color={theme.text} />
              </TouchableOpacity>

              {/* Repeat */}
              <TouchableOpacity onPress={cycleRepeatMode} style={styles.sideCtrlBtn} activeOpacity={0.7}>
                <Ionicons
                  name={repeatMode === 'one' ? 'repeat-outline' : 'repeat'}
                  size={24}
                  color={repeatMode !== 'off' ? theme.primary : theme.textMuted}
                />
                {repeatMode === 'one' && (
                  <Text style={[styles.repeatOneBadge, { color: theme.primary }]}>1</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Equalizer Modal */}
        <Modal
          visible={showEqualizer}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEqualizer(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.dialogCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.dialogHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="options-outline" size={22} color={theme.primary} />
                  <Text style={[styles.dialogTitle, { color: theme.text }]}>Advanced Equalizer</Text>
                </View>
                <TouchableOpacity onPress={() => setShowEqualizer(false)}>
                  <Ionicons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted, marginBottom: 8 }}>
                PRESETS
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {['flat', 'bass_boost', 'treble_boost', 'vocal', 'acoustic', 'electronic', 'rock'].map(preset => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => setEqualizerPreset(preset)}
                    style={[
                      styles.eqPresetChip,
                      {
                        backgroundColor: equalizerPreset === preset ? theme.primary : theme.surface,
                        borderColor: equalizerPreset === preset ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: equalizerPreset === preset ? '#FFF' : theme.text,
                        textTransform: 'capitalize',
                      }}
                    >
                      {preset.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 3-Band Sliders */}
              <View style={[styles.eqSlidersContainer, { backgroundColor: theme.surface }]}>
                {/* Bass */}
                <View style={styles.eqBandColumn}>
                  <Text style={[styles.eqDbText, { color: theme.primary }]}>
                    {equalizerBass > 0 ? `+${equalizerBass}` : equalizerBass} dB
                  </Text>
                  <View style={styles.eqControlRow}>
                    <TouchableOpacity
                      onPress={() => setEqualizerBand('bass', Math.max(-12, equalizerBass - 2))}
                      style={[styles.eqStepBtn, { backgroundColor: theme.card }]}
                    >
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEqualizerBand('bass', Math.min(12, equalizerBass + 2))}
                      style={[styles.eqStepBtn, { backgroundColor: theme.card }]}
                    >
                      <Ionicons name="add" size={16} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.eqBandLabel, { color: theme.text }]}>Bass (60Hz)</Text>
                </View>

                {/* Mid */}
                <View style={styles.eqBandColumn}>
                  <Text style={[styles.eqDbText, { color: theme.primary }]}>
                    {equalizerMid > 0 ? `+${equalizerMid}` : equalizerMid} dB
                  </Text>
                  <View style={styles.eqControlRow}>
                    <TouchableOpacity
                      onPress={() => setEqualizerBand('mid', Math.max(-12, equalizerMid - 2))}
                      style={[styles.eqStepBtn, { backgroundColor: theme.card }]}
                    >
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEqualizerBand('mid', Math.min(12, equalizerMid + 2))}
                      style={[styles.eqStepBtn, { backgroundColor: theme.card }]}
                    >
                      <Ionicons name="add" size={16} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.eqBandLabel, { color: theme.text }]}>Mid (1kHz)</Text>
                </View>

                {/* Treble */}
                <View style={styles.eqBandColumn}>
                  <Text style={[styles.eqDbText, { color: theme.primary }]}>
                    {equalizerTreble > 0 ? `+${equalizerTreble}` : equalizerTreble} dB
                  </Text>
                  <View style={styles.eqControlRow}>
                    <TouchableOpacity
                      onPress={() => setEqualizerBand('treble', Math.max(-12, equalizerTreble - 2))}
                      style={[styles.eqStepBtn, { backgroundColor: theme.card }]}
                    >
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEqualizerBand('treble', Math.min(12, equalizerTreble + 2))}
                      style={[styles.eqStepBtn, { backgroundColor: theme.card }]}
                    >
                      <Ionicons name="add" size={16} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.eqBandLabel, { color: theme.text }]}>Treble (10kHz)</Text>
                </View>
              </View>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  onPress={() => setEqualizerPreset('flat')}
                  style={[styles.dialogBtn, { backgroundColor: theme.surface }]}
                >
                  <Text style={{ color: theme.text, fontWeight: '700' }}>RESET</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEqualizer(false)}
                  style={[styles.dialogBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Sleep Timer Modal */}
        <Modal
          visible={showSleepTimer}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSleepTimer(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.dialogCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.dialogHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="moon" size={22} color={theme.primary} />
                  <Text style={[styles.dialogTitle, { color: theme.text }]}>Sleep Timer</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSleepTimer(false)}>
                  <Ionicons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              {sleepTimerMode && (
                <View style={[styles.activeTimerBox, { backgroundColor: theme.primaryGlow, borderColor: theme.primary }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>ACTIVE TIMER</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: theme.primary, marginVertical: 2 }}>
                    {sleepTimerMode === 'end_of_track' ? 'End of Song' : `${sleepTimerMinutesRemaining}m Remaining`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      cancelSleepTimer();
                      Alert.alert('Sleep Timer', 'Timer canceled.');
                    }}
                    style={{ marginTop: 4 }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.danger || '#EF4444' }}>
                      CANCEL ACTIVE TIMER
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12 }}>
                Playback will automatically pause after the chosen duration:
              </Text>

              <View style={styles.timerPresetsGrid}>
                {[15, 30, 45, 60].map(mins => (
                  <TouchableOpacity
                    key={`mins-${mins}`}
                    onPress={() => {
                      setSleepTimer(mins);
                      setShowSleepTimer(false);
                      Alert.alert('Sleep Timer', `Music will automatically stop in ${mins} minutes.`);
                    }}
                    style={[styles.timerPresetBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{mins} Mins</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => {
                    setSleepTimer('end_of_track');
                    setShowSleepTimer(false);
                    Alert.alert('Sleep Timer', 'Music will stop after current song finishes.');
                  }}
                  style={[styles.timerPresetBtn, { backgroundColor: theme.surface, borderColor: theme.border, width: '100%' }]}
                >
                  <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>End of Current Song</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  onPress={() => setShowSleepTimer(false)}
                  style={[styles.dialogBtn, { backgroundColor: theme.surface, width: '100%' }]}
                >
                  <Text style={{ color: theme.text, fontWeight: '700' }}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Dedicated YouTube Video Player Modal */}
        <YouTubePlayerModal
          visible={ytPlayerVisible}
          onClose={() => setYtPlayerVisible(false)}
          track={currentTrack}
          queue={queue}
          onTrackChange={t => playTrack(t, queue)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  mainScroll: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
  },
  rectArtworkContainer: {
    width: SCREEN_WIDTH - 48,
    height: (SCREEN_WIDTH - 48) * 0.92,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
    position: 'relative',
  },
  rectArtworkGlow: {
    position: 'absolute',
    width: '98%',
    height: '98%',
    borderRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 12,
  },
  rectArtworkCard: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  rectArtworkImage: {
    width: '100%',
    height: '100%',
  },
  mediaBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mediaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  volumeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
    gap: 10,
  },
  volumeIconBtn: {
    padding: 2,
  },
  volumeBarBg: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  volumePercentText: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 38,
    textAlign: 'center',
  },
  boostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  boostBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  changeArtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  changeArtText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
    width: '100%',
    marginBottom: 16,
  },
  vBar: {
    width: 4,
    borderRadius: 2,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  trackTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  trackArtist: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  likeBtn: {
    padding: 6,
  },
  scrubContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  sideCtrlBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  repeatOneBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 9,
    fontWeight: '900',
  },
  navCtrlBtn: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hugePlayPauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  queueContainer: {
    flex: 1,
    padding: 20,
  },
  queueHeading: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 16,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  queueThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  queueArtist: {
    fontSize: 12,
    marginTop: 2,
  },
  lyricLineItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  lyricTimeTag: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  lyricLineText: {
    lineHeight: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  dialogHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqPresetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  eqSlidersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 16,
    marginVertical: 10,
  },
  eqBandColumn: {
    alignItems: 'center',
  },
  eqDbText: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  eqControlRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  eqStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqBandLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeTimerBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 14,
  },
  timerPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timerPresetBtn: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
