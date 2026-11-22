// ==============================================================================
// NEXORA NATIVE CAMERA & VIDEO RECORDER
// Full-screen native capture, instant cloud preview & upload
// ==============================================================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useMediaStore } from '../../stores/mediaStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CameraCaptureModal: React.FC<Props> = ({ visible, onClose }) => {
  const { theme } = useThemeStore();
  const { uploadFile } = useMediaStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [capturedMedia, setCapturedMedia] = useState<{
    uri: string;
    type: 'photo' | 'video';
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!visible) return null;

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
          <Ionicons name="camera-outline" size={64} color={theme.primary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>CAMERA ACCESS</Text>
          <Text style={[styles.permissionDesc, { color: theme.textMuted }]}>
            NEXORA needs camera access to capture high-definition photos and videos to your private cloud ecosystem.
          </Text>
          <TouchableOpacity
            style={[styles.permButton, { backgroundColor: theme.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permButtonText}>GRANT PERMISSION</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
        });
        if (photo) {
          setCapturedMedia({ uri: photo.uri, type: 'photo' });
        }
      } catch (err) {
        console.warn('Take picture error:', err);
      }
    }
  };

  const handleConfirmUpload = async () => {
    if (!capturedMedia) return;

    try {
      setIsUploading(true);
      const isVideo = capturedMedia.type === 'video';
      const fileName = `capture_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';

      await uploadFile({
        uri: capturedMedia.uri,
        name: fileName,
        mimeType,
        size: 2400000,
      });

      setIsUploading(false);
      setCapturedMedia(null);
      onClose();
    } catch (err: any) {
      setIsUploading(false);
      console.warn('Upload captured error:', err);
    }
  };

  const handleRetake = () => {
    setCapturedMedia(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!capturedMedia ? (
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
            />

            {/* Overlaid Controls */}
            <View style={styles.cameraOverlay}>
              {/* Top Toolbar */}
              <View style={styles.topToolbar}>
                <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                  <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}
                  style={styles.iconBtn}
                >
                  <Ionicons
                    name={flash === 'on' ? 'flash' : 'flash-off'}
                    size={24}
                    color={flash === 'on' ? '#FBBF24' : '#FFF'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFacing(f => (f === 'back' ? 'front' : 'back'))}
                  style={styles.iconBtn}
                >
                  <Ionicons name="camera-reverse" size={26} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Bottom Shutter Controls */}
              <View style={styles.shutterRow}>
                <View style={{ width: 48 }} />
                <TouchableOpacity style={styles.shutterOuter} onPress={takePhoto}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
                <View style={{ width: 48 }} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedMedia.uri }} style={styles.previewMedia} />

            {/* Preview Action Bar */}
            <View style={styles.previewActionsBar}>
              <TouchableOpacity
                style={[styles.previewActionBtn, { backgroundColor: '#334155' }]}
                onPress={handleRetake}
                disabled={isUploading}
              >
                <Ionicons name="refresh" size={22} color="#FFF" />
                <Text style={styles.previewActionText}>RETAKE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.previewActionBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirmUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={22} color="#FFF" />
                    <Text style={styles.previewActionText}>UPLOAD TO CLOUD</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 24,
  },
  shutterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#000',
  },
  previewMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.82,
  },
  previewActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    backgroundColor: '#000',
  },
  previewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  previewActionText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
  },
  permissionDesc: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 28,
  },
  permButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  permButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  cancelButton: {
    padding: 10,
  },
  cancelButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
