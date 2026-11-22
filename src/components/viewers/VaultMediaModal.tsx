// ==============================================================================
// NEXORA VAULT MEDIA VIEWER MODAL
// Full-screen decrypted media viewer with cryptographic inspection & actions
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VaultItem } from '../../types';
import { useThemeStore } from '../../stores/themeStore';
import { useVaultStore } from '../../stores/vaultStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  item: VaultItem | null;
  visible: boolean;
  onClose: () => void;
}

export const VaultMediaModal: React.FC<Props> = ({ item, visible, onClose }) => {
  const { theme } = useThemeStore();
  const { restoreItemToFiles, exportDecryptedItem, deleteVaultItem, lockVault } = useVaultStore();
  const [showCryptoDetails, setShowCryptoDetails] = useState(false);

  const [scaleAnim] = useState(() => new Animated.Value(0.92));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
      setTimeout(() => setShowCryptoDetails(false), 0);
    }
  }, [visible]);

  if (!item) return null;

  const displayName = item.decryptedName || 'Encrypted File';
  const displayUri = item.decryptedUri || item.localEncryptedPath;
  const isImage = item.decryptedType === 'image' || (!item.decryptedType && displayUri?.match(/\.(jpg|jpeg|png|webp|gif)$/i));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDecryptToFiles = () => {
    Alert.alert(
      'Decrypt & Restore to Files',
      `This will decrypt "${displayName}" and move it back into your main Files gallery so it is publicly accessible in the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decrypt & Restore',
          onPress: async () => {
            try {
              await restoreItemToFiles(item.id);
              onClose();
              Alert.alert('Decrypted', `"${displayName}" has been restored to your main Files library.`);
            } catch (err: any) {
              Alert.alert('Restoration Failed', err.message);
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      await exportDecryptedItem(item.id);
    } catch (err: any) {
      Alert.alert('Export Notice', err?.message || 'Could not export file.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Cryptographic Shred',
      `Permanently erase this file from zero-knowledge storage? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Permanently',
          style: 'destructive',
          onPress: async () => {
            await deleteVaultItem(item.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleImmediateLock = () => {
    lockVault();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Bar */}
          <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={[styles.roundBtn, { backgroundColor: theme.card }]}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.titleBox}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
                <Text style={[styles.statusTag, { color: theme.success }]}>DECRYPTED IN MEMORY</Text>
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                {displayName}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleImmediateLock}
              style={[styles.roundBtn, { backgroundColor: theme.card, borderColor: theme.danger, borderWidth: 1 }]}
            >
              <Ionicons name="lock-closed" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>

          {/* Media Presentation Viewport */}
          <View style={styles.mediaViewport}>
            {isImage && displayUri ? (
              <Image
                source={{ uri: displayUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ) : item.decryptedType === 'video' ? (
              <View style={styles.cipherFallbackBox}>
                <View style={[styles.fallbackIconRing, { backgroundColor: theme.primaryGlow }]}>
                  <Ionicons name="film" size={48} color={theme.primary} />
                </View>
                <Text style={[styles.fallbackTitle, { color: theme.text }]}>Encrypted Video Stream</Text>
                <Text style={[styles.fallbackSub, { color: theme.textSubtle }]}>{displayName}</Text>
              </View>
            ) : item.decryptedType === 'audio' ? (
              <View style={styles.cipherFallbackBox}>
                <View style={[styles.fallbackIconRing, { backgroundColor: theme.primaryGlow }]}>
                  <Ionicons name="musical-notes" size={48} color={theme.primary} />
                </View>
                <Text style={[styles.fallbackTitle, { color: theme.text }]}>Encrypted Audio Track</Text>
                <Text style={[styles.fallbackSub, { color: theme.textSubtle }]}>{displayName}</Text>
              </View>
            ) : (
              <View style={styles.cipherFallbackBox}>
                <View style={[styles.fallbackIconRing, { backgroundColor: theme.primaryGlow }]}>
                  <Ionicons name="document-lock" size={48} color={theme.primary} />
                </View>
                <Text style={[styles.fallbackTitle, { color: theme.text }]}>Secure Document</Text>
                <Text style={[styles.fallbackSub, { color: theme.textSubtle }]}>{displayName}</Text>
              </View>
            )}
          </View>

          {/* Bottom Info & Action Sheet */}
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <View style={styles.metaRow}>
              <View>
                <Text style={[styles.metaLabel, { color: theme.textSubtle }]}>FILE SIZE</Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>{formatFileSize(item.sizeBytes)}</Text>
              </View>

              <View>
                <Text style={[styles.metaLabel, { color: theme.textSubtle }]}>CIPHER PROTOCOL</Text>
                <Text style={[styles.metaValue, { color: theme.accent }]}>AES-256-GCM</Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowCryptoDetails(!showCryptoDetails)}
                style={[styles.inspectBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Ionicons
                  name={showCryptoDetails ? 'chevron-down' : 'shield-half'}
                  size={14}
                  color={theme.primary}
                />
                <Text style={[styles.inspectBtnText, { color: theme.primary }]}>
                  {showCryptoDetails ? 'Hide Cipher' : 'Inspect Cipher'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Expandable Crypto Details */}
            {showCryptoDetails && (
              <ScrollView style={[styles.cryptoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cryptoDetailLine, { color: theme.textMuted }]}>
                  <Text style={{ fontWeight: '800', color: theme.text }}>PBKDF2 Key Derivation:</Text> SHA-256 (5,000 rounds)
                </Text>
                <Text style={[styles.cryptoDetailLine, { color: theme.textMuted }]}>
                  <Text style={{ fontWeight: '800', color: theme.text }}>IV / Nonce:</Text> {item.nonce}
                </Text>
                <Text style={[styles.cryptoDetailLine, { color: theme.textMuted }]}>
                  <Text style={{ fontWeight: '800', color: theme.text }}>Salt:</Text> {item.salt}
                </Text>
                <Text style={[styles.cryptoDetailLine, { color: theme.textMuted }]} numberOfLines={1}>
                  <Text style={{ fontWeight: '800', color: theme.text }}>HMAC Tag:</Text> {item.authTag}
                </Text>
              </ScrollView>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                onPress={handleDecryptToFiles}
                activeOpacity={0.8}
              >
                <Ionicons name="lock-open-outline" size={18} color="#FFF" />
                <Text style={styles.primaryActionBtnText}>DECRYPT TO FILES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleExport}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={18} color={theme.text} />
                <Text style={[styles.secondaryActionBtnText, { color: theme.text }]}>SHARE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconActionBtn, { backgroundColor: theme.card, borderColor: theme.danger }]}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 800,
    height: SCREEN_HEIGHT,
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 48 : 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBox: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  mediaViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 16,
    width: '100%',
    maxWidth: 800,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    maxWidth: 800,
  },
  cipherFallbackBox: {
    alignItems: 'center',
    padding: 30,
  },
  fallbackIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  fallbackSub: {
    fontSize: 13,
  },
  bottomSheet: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cryptoCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 120,
    marginBottom: 14,
  },
  cryptoDetailLine: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  iconActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
