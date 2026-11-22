// ==============================================================================
// NEXORA MEDIA VIEWER MODAL
// High-fidelity full-screen viewer for Images, Videos, Audio, PDFs & Documents
// ==============================================================================

import React from 'react';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WebView } from 'react-native-webview';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { MediaFile } from '../../types';
import { useThemeStore } from '../../stores/themeStore';
import { useMediaStore } from '../../stores/mediaStore';
import { usePlayerStore } from '../../stores/playerStore';
import { pickMediaFromLibrary } from '../../services/mediaPicker';

interface Props {
  file: MediaFile | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function StandardVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, video => {
    video.loop = true;
    video.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const online = /^https?:\/\//i.test(uri);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  if (status === 'error') {
    return (
      <View style={styles.videoFallbackBox}>
        <Ionicons name="film-outline" size={48} color="#6366F1" />
        <Text style={styles.videoFallbackTitle}>Unable to play this video</Text>
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      style={styles.fullVideo}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture={online}
      startsPictureInPictureAutomatically={online && isPlaying}
    />
  );
}

function VideoPlayerWrapper({ uri }: { uri: string }) {
  const isYouTube = typeof uri === 'string' && (uri.includes('youtube.com') || uri.includes('youtu.be'));

  if (isYouTube) {
    const match = uri.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([A-Za-z0-9_-]{11})/);
    const ytid = match ? match[1] : '4NRXx6U8ABQ';
    const playerUrl = `https://www.youtube-nocookie.com/embed/${ytid}?autoplay=1&playsinline=1&controls=1&rel=0&enablejsapi=1&origin=https://www.youtube.com`;

    return (
      <WebView
        originWhitelist={['*']}
        source={{
          uri: playerUrl,
          headers: { Referer: 'https://www.youtube.com' },
        }}
        style={styles.fullVideo}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        mixedContentMode="always"
        userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />
    );
  }

  return <StandardVideoPlayer uri={uri} />;
}

export const MediaViewerModal: React.FC<Props> = ({ file, onClose }) => {
  const { theme } = useThemeStore();
  const { toggleFavourite, updateFileThumbnail, softDeleteFiles } = useMediaStore();
  const { playTrack, updateTrackArtwork, deleteTrack } = usePlayerStore();

  if (!file) return null;

  const handleDeleteFile = () => {
    if (!file) return;
    Alert.alert(
      'Delete File',
      `Are you sure you want to permanently delete "${file.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (file.fileType === 'audio') {
                deleteTrack(file.id);
              } else {
                await softDeleteFiles([file.id]);
              }
              onClose();
              Alert.alert('Deleted', `"${file.name}" has been deleted.`);
            } catch (err: any) {
              Alert.alert('Delete Error', err?.message || 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const handleChangeCoverArt = async () => {
    try {
      const picked = await pickMediaFromLibrary('images');
      if (picked) {
        await updateFileThumbnail(file.id, picked.uri);
        await updateTrackArtwork(file.id, picked.uri);
        Alert.alert('Cover Updated', `Cover image updated for "${file.name}".`);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update image');
    }
  };

  const handleShare = async () => {
    try {
      if (!file.uri) return;
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) return;

      let shareableUri = file.uri;
      if (shareableUri.startsWith('http://') || shareableUri.startsWith('https://')) {
        const cacheDir = (FileSystem as any).cacheDirectory || '';
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const localPath = `${cacheDir}share_${Date.now()}_${safeName}`;
        const downloadRes = await FileSystem.downloadAsync(shareableUri, localPath);
        shareableUri = downloadRes.uri;
      }
      await Sharing.shareAsync(shareableUri);
    } catch (err: any) {
      console.warn('Share error:', err?.message);
    }
  };

  const handleEncryptToVault = () => {
    Alert.alert(
      'Encrypt to Private Vault',
      `Encrypt "${file.name}" with client-side AES-256 and store in your zero-knowledge Vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Encrypt to Vault',
          onPress: async () => {
            try {
              const { useVaultStore } = await import('../../stores/vaultStore');
              await useVaultStore.getState().addFileToVault({
                name: file.name,
                uri: file.uri || file.storagePath,
                mimeType: file.mimeType,
                size: file.sizeBytes,
              });
              onClose();
              Alert.alert('Encrypted', `"${file.name}" has been transferred to your Private Vault.`);
            } catch (e: any) {
              Alert.alert('Vault Error', e?.message || 'Failed to encrypt file');
            }
          },
        },
      ]
    );
  };

  const handlePlayAudioInPlayer = () => {
    playTrack({
      id: file.id,
      url: file.uri || file.storagePath,
      title: file.title || file.name,
      artist: file.artist || 'Unknown Artist',
      album: file.album || 'NEXORA Cloud',
      artwork: file.thumbnailPath || undefined,
      duration: file.durationSeconds || undefined,
    });
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <Modal visible={!!file} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Top Action Bar */}
        <View style={[styles.topBar, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.actionBtn}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.topTitle} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={styles.topSubtitle}>
              {formatFileSize(file.sizeBytes)} • {file.fileType.toUpperCase()}
            </Text>
          </View>
          <View style={styles.topRightBtns}>
            <TouchableOpacity onPress={handleEncryptToVault} style={styles.actionBtn}>
              <Ionicons name="shield-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleFavourite(file.id)} style={styles.actionBtn}>
              <Ionicons
                name={file.isFavourite ? 'heart' : 'heart-outline'}
                size={24}
                color={file.isFavourite ? theme.danger : '#FFF'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
              <Ionicons name="share-social-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteFile} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Viewer Body */}
        <View style={styles.contentBody}>
          {file.fileType === 'image' && (
            <Image
              source={{ uri: file.uri || file.storagePath }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}

          {file.fileType === 'video' && (
            <View style={styles.videoWrapper}>
              <VideoPlayerWrapper uri={file.uri || file.storagePath} />
            </View>
          )}

          {file.fileType === 'audio' && (
            <View style={styles.audioPreviewCard}>
              <View style={[styles.artworkRect, { backgroundColor: theme.primaryGlow, overflow: 'hidden' }]}>
                {file.thumbnailPath ? (
                  <Image
                    source={{ uri: file.thumbnailPath }}
                    style={styles.audioArtworkImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="musical-notes" size={72} color={theme.primary} />
                )}
              </View>
              <Text style={styles.audioTitle}>{file.title || file.name}</Text>
              <Text style={styles.audioArtist}>{file.artist || 'Audio Track'}</Text>

              <View style={styles.audioBtnsRow}>
                <TouchableOpacity
                  style={[styles.audioActionBtn, { backgroundColor: theme.primary }]}
                  onPress={handlePlayAudioInPlayer}
                >
                  <Ionicons name="play" size={18} color="#FFF" />
                  <Text style={styles.audioActionBtnText}>PLAY</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.audioActionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }]}
                  onPress={handleChangeCoverArt}
                >
                  <Ionicons name="camera-outline" size={18} color="#38BDF8" />
                  <Text style={[styles.audioActionBtnText, { color: '#38BDF8' }]}>CHANGE COVER</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(file.fileType === 'pdf' || file.fileType === 'document' || file.fileType === 'other') && (
            <View style={styles.docPreviewCard}>
              <View style={[styles.docIconCircle, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons
                  name={file.fileType === 'pdf' ? 'document-text' : 'folder-open'}
                  size={64}
                  color={theme.primary}
                />
              </View>
              <Text style={styles.docTitle}>{file.name}</Text>
              <Text style={styles.docMeta}>
                Size: {formatFileSize(file.sizeBytes)} • Encrypted Cloud Blob
              </Text>

              <TouchableOpacity
                style={[styles.docActionBtn, { backgroundColor: theme.primary }]}
                onPress={handleShare}
              >
                <Ionicons name="open-outline" size={20} color="#FFF" />
                <Text style={styles.docActionText}>EXPORT / OPEN IN EXTERNAL APP</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'space-between',
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionBtn: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  topTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  topSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  topRightBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  contentBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
    maxWidth: 800,
    aspectRatio: 16 / 9,
  },
  videoFallbackBox: {
    width: SCREEN_WIDTH - 64,
    maxWidth: 500,
    height: 240,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoFallbackTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  videoFallbackUri: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  audioPreviewCard: {
    alignItems: 'center',
    padding: 24,
  },
  artworkRect: {
    width: 220,
    height: 220,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    overflow: 'hidden',
  },
  audioArtworkImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  audioTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  audioArtist: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 20,
  },
  audioBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  audioActionBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  playInEngineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  playInEngineText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  docPreviewCard: {
    alignItems: 'center',
    padding: 24,
  },
  docIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  docTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  docMeta: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 24,
  },
  docActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  docActionText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
