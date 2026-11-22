// ==============================================================================
// NEXORA ZERO-KNOWLEDGE PRIVATE VAULT SCREEN
// Biometric authentication, PIN setup, client-side AES-256 encrypted media
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useVaultStore } from '../../stores/vaultStore';
import { useAuthStore } from '../../stores/authStore';
import { pickMediaFromLibrary, pickDocumentFromSystem, takePhotoWithCamera } from '../../services/mediaPicker';
import { VaultMediaModal } from '../../components/viewers/VaultMediaModal';
import { VaultItem } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VaultScreen() {
  const { theme } = useThemeStore();
  const { hasBiometrics } = useAuthStore();
  const {
    isLocked,
    isConfiguredWithPIN,
    vaultItems,
    isLoading,
    checkVaultSetup,
    setupVaultPIN,
    unlockWithPIN,
    unlockWithBiometrics,
    lockVault,
    addFileToVault,
    deleteVaultItem,
    restoreItemToFiles,
    exportDecryptedItem,
    error,
  } = useVaultStore();

  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [activeDecryptedItem, setActiveDecryptedItem] = useState<VaultItem | null>(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [glowAnim] = useState(() => new Animated.Value(0.4));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [spinValue] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 9000,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    // Breathing pulse loop for vault shield & aura
    const breathing = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.85, duration: 2000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
        ]),
      ])
    );
    breathing.start();

    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    return () => {
      spinLoop.stop();
      breathing.stop();
    };
  }, [isLocked]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await checkVaultSetup();
    setRefreshing(false);
  };

  useEffect(() => {
    checkVaultSetup();
  }, []);

  const handleUnlockPIN = async () => {
    if (!pinInput.trim()) return;
    const ok = await unlockWithPIN(pinInput.trim());
    if (ok) {
      setPinInput('');
    }
  };

  const handleSetupPIN = async () => {
    if (pinInput.trim().length < 3) {
      Alert.alert('Password Length', 'Please set a Master Password of at least 3 characters.');
      return;
    }
    await setupVaultPIN(pinInput.trim());
    setPinInput('');
  };

  const handleCameraCapture = async () => {
    setImportModalVisible(false);
    try {
      const picked = await takePhotoWithCamera();
      if (picked) {
        await addFileToVault(picked);
      }
    } catch (e: any) {
      Alert.alert('Camera Notice', e?.message || 'Could not capture photo.');
    }
  };

  const handleGalleryImport = async () => {
    setImportModalVisible(false);
    try {
      const picked = await pickMediaFromLibrary('all');
      if (picked) {
        await addFileToVault(picked);
      }
    } catch (e: any) {
      Alert.alert('Gallery Notice', e?.message || 'Could not import media.');
    }
  };

  const handleDocumentImport = async () => {
    setImportModalVisible(false);
    try {
      const picked = await pickDocumentFromSystem();
      if (picked) {
        await addFileToVault(picked);
      }
    } catch (e: any) {
      Alert.alert('Document Notice', e?.message || 'Could not import file.');
    }
  };

  const handleDeleteItem = (item: VaultItem) => {
    const name = item.decryptedName || 'encrypted file';
    Alert.alert('Cryptographic Erase', `Permanently shred "${name}" from your private vault?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Shred', style: 'destructive', onPress: () => deleteVaultItem(item.id) },
    ]);
  };

  const handleRestoreItem = (item: VaultItem) => {
    const name = item.decryptedName || 'this file';
    Alert.alert(
      'Decrypt & Move to Files',
      `Decrypt "${name}" and return it to your public Files library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decrypt',
          onPress: async () => {
            try {
              await restoreItemToFiles(item.id);
              Alert.alert('Decrypted', `"${name}" restored to regular Files.`);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleBiometricUnlock = async () => {
    setBiometricModalVisible(false);
    setBiometricLoading(true);
    try {
      const result = await unlockWithBiometrics();
      if (!result) {
        Alert.alert('Authentication Failed', 'Biometric authentication was not completed or failed.');
      }
    } catch (e: any) {
      Alert.alert('Auth Error', e?.message || 'Failed to authenticate with biometrics.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const totalVaultBytes = vaultItems.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);

  // 1. LOCKED VIEW
  if (isLocked) {
    return (
      <Animated.View style={[styles.lockedContainer, { backgroundColor: theme.background, opacity: fadeAnim }]}>
        {/* Animated Cyber Core with Rotating Neon Ring */}
        <View style={styles.vaultCoreWrapper}>
          {/* Glowing Ambient Aura */}
          <Animated.View
            style={[
              styles.shieldGlow,
              {
                backgroundColor: theme.primaryGlow,
                opacity: glowAnim,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Rotating Outer Cyber Ring */}
          <Animated.View
            style={[
              styles.cyberRing,
              {
                borderColor: theme.accent,
                transform: [{ rotate: spin }],
              },
            ]}
          />

          {/* Shield Icon Box */}
          <Animated.View
            style={[
              styles.shieldCircle,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primary,
                transform: [{ scale: pulseAnim }],
                shadowColor: theme.primary,
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={60} color={theme.primary} />
          </Animated.View>
        </View>

        {/* Security Badge */}
        <View style={[styles.securityBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />
          <Text style={[styles.securityBadgeText, { color: theme.accent }]}>
            ZERO-KNOWLEDGE AES-256
          </Text>
        </View>

        <Text style={[styles.lockedTitle, { color: theme.text }]}>
          {isConfiguredWithPIN ? 'AK PRIVATE VAULT' : 'CREATE MASTER PIN'}
        </Text>

        <Text style={[styles.lockedDesc, { color: theme.textMuted }]}>
          {isConfiguredWithPIN
            ? 'End-to-end encrypted on your device. Enter your Master PIN or authenticate with Biometrics to decrypt your media.'
            : 'Initialize your client-side encryption key. All vault media will be derived from this secret PIN.'}
        </Text>

        {/* PIN Input Form */}
        <View style={styles.pinInputContainer}>
          <View style={[styles.pinInputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="key-outline" size={20} color={theme.textSubtle} style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Enter Password (2003 or arif)"
              placeholderTextColor={theme.textSubtle}
              secureTextEntry={!showPin}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              value={pinInput}
              onChangeText={setPinInput}
              onSubmitEditing={isConfiguredWithPIN ? handleUnlockPIN : handleSetupPIN}
              style={[styles.pinInput, { color: theme.text }]}
            />
            <TouchableOpacity onPress={() => setShowPin(!showPin)} style={{ padding: 6 }}>
              <Ionicons
                name={showPin ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textSubtle}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Master Password Hint */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingHorizontal: 16 }}>
          <Ionicons name="key" size={15} color={theme.accent} />
          <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center' }}>
            Vault Password: <Text style={{ color: theme.accent, fontWeight: '800' }}>2003</Text> or <Text style={{ color: theme.accent, fontWeight: '800' }}>arif</Text>
          </Text>
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.danger + '20', borderColor: theme.danger }]}>
            <Ionicons name="alert-circle" size={16} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.authButtonsRow}>
          <TouchableOpacity
            style={[styles.authMainBtn, { backgroundColor: theme.primary }]}
            onPress={isConfiguredWithPIN ? handleUnlockPIN : handleSetupPIN}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="lock-open-outline" size={20} color="#FFF" />
                <Text style={styles.authMainBtnText}>
                  {isConfiguredWithPIN ? 'UNLOCK & DECRYPT' : 'ACTIVATE VAULT'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {isConfiguredWithPIN && hasBiometrics && (
            <TouchableOpacity
              style={[styles.biometricBtn, { backgroundColor: theme.card, borderColor: theme.primary }]}
              onPress={() => setBiometricModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="finger-print" size={28} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  }

  // 2. UNLOCKED VIEW
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View>
          <View style={styles.unlockedBadge}>
            <View style={[styles.activeDot, { backgroundColor: theme.success }]} />
            <Text style={[styles.badgeText, { color: theme.success }]}>ZERO-KNOWLEDGE UNLOCKED</Text>
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>AK VAULT</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={() => setImportModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
            onPress={lockVault}
            activeOpacity={0.8}
          >
            <Ionicons name="lock-closed" size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.contentContainer}
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
        {/* Security & Storage Overview Card */}
        <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statsCardRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: theme.text }]}>{vaultItems.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSubtle }]}>LOCKED FILES</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: theme.accent }]}>{formatFileSize(totalVaultBytes)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSubtle }]}>ENCRYPTED SIZE</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: theme.success }]}>AES-256</Text>
              <Text style={[styles.statLabel, { color: theme.textSubtle }]}>HARDWARE KEY</Text>
            </View>
          </View>
        </View>

        {/* Section Heading & Encrypt Button */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>
            DECRYPTED MEDIA ({vaultItems.length})
          </Text>
          <TouchableOpacity
            style={[styles.encryptPillBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setImportModalVisible(true)}
          >
            <Ionicons name="shield" size={13} color={theme.primary} />
            <Text style={[styles.encryptPillText, { color: theme.primary }]}>+ ENCRYPT FILE</Text>
          </TouchableOpacity>
        </View>

        {vaultItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="shield-outline" size={48} color={theme.textSubtle} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Vault is Empty</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Photos, videos, and documents imported here are encrypted with AES-256 before leaving your device.
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
              onPress={() => setImportModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.emptyAddBtnText}>IMPORT & ENCRYPT FILE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {vaultItems.map(item => {
              const displayName = item.decryptedName || 'AES256_Blob.enc';
              const hasDecryptedMedia = !!item.decryptedUri;
              const isImage = item.decryptedType === 'image' || (!item.decryptedType && item.decryptedUri?.match(/\.(jpg|jpeg|png|webp)$/i));

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => setActiveDecryptedItem(item)}
                  style={[styles.vaultCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  {/* Thumbnail / Cipher Preview */}
                  <View style={[styles.vaultThumbBox, { backgroundColor: theme.surface }]}>
                    {hasDecryptedMedia && isImage ? (
                      <Image
                        source={{ uri: item.decryptedUri }}
                        style={styles.vaultThumbImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.cipherIconBox}>
                        <Ionicons
                          name={
                            item.decryptedType === 'video'
                              ? 'film'
                              : item.decryptedType === 'audio'
                              ? 'musical-notes'
                              : item.decryptedType === 'pdf' || item.decryptedType === 'document'
                              ? 'document-lock'
                              : 'shield-checkmark'
                          }
                          size={36}
                          color={theme.primary}
                        />
                        <Text style={[styles.cipherLabel, { color: theme.primary }]}>
                          {item.decryptedType ? item.decryptedType.toUpperCase() : 'ENCRYPTED'}
                        </Text>
                      </View>
                    )}

                    {/* AES-256 Security Tag */}
                    <View style={[styles.secureTagBadge, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}>
                      <Ionicons name="lock-closed" size={10} color={theme.accent} />
                      <Text style={[styles.secureTagText, { color: theme.accent }]}>AES-256</Text>
                    </View>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.vaultCardFooter}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={[styles.vaultFileName, { color: theme.text }]} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={[styles.vaultFileSize, { color: theme.textSubtle }]}>
                        {formatFileSize(item.sizeBytes)}
                      </Text>
                    </View>

                    {/* Quick Decrypt / Actions Menu */}
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Vault Actions', displayName, [
                          { text: 'View Decrypted Media', onPress: () => setActiveDecryptedItem(item) },
                          { text: 'Decrypt & Restore to Files', onPress: () => handleRestoreItem(item) },
                          { text: 'Export / Share', onPress: () => exportDecryptedItem(item.id) },
                          { text: 'Cryptographic Shred', style: 'destructive', onPress: () => handleDeleteItem(item) },
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }}
                      style={styles.cardMenuBtn}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color={theme.textSubtle} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Decrypted Media Viewer Modal */}
      <VaultMediaModal
        item={activeDecryptedItem}
        visible={!!activeDecryptedItem}
        onClose={() => setActiveDecryptedItem(null)}
      />

      {/* Import Source Choice Modal */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImportModalVisible(false)}
        >
          <View style={[styles.importMenuBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.importMenuHeader}>
              <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
              <Text style={[styles.importMenuTitle, { color: theme.text }]}>ENCRYPT NEW MEDIA</Text>
            </View>
            <Text style={[styles.importMenuSubtitle, { color: theme.textMuted }]}>
              Selected files will be encrypted on-device with AES-256 before storage.
            </Text>

            <TouchableOpacity
              style={[styles.importOptionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleCameraCapture}
              activeOpacity={0.8}
            >
              <View style={[styles.importIconCircle, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="camera" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.importOptionTitle, { color: theme.text }]}>Take Private Photo</Text>
                <Text style={[styles.importOptionSub, { color: theme.textSubtle }]}>
                  Capture directly into encrypted vault
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.importOptionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleGalleryImport}
              activeOpacity={0.8}
            >
              <View style={[styles.importIconCircle, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="images" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.importOptionTitle, { color: theme.text }]}>Photo & Video Library</Text>
                <Text style={[styles.importOptionSub, { color: theme.textSubtle }]}>
                  Select from gallery to encrypt
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.importOptionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={handleDocumentImport}
              activeOpacity={0.8}
            >
              <View style={[styles.importIconCircle, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="document-text" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.importOptionTitle, { color: theme.text }]}>Document / PDF Picker</Text>
                <Text style={[styles.importOptionSub, { color: theme.textSubtle }]}>
                  Encrypt confidential PDFs & documents
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.card }]}
              onPress={() => setImportModalVisible(false)}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Biometric Unlock Modal - Card-based popup */}
      <Modal
        visible={biometricModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBiometricModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBiometricModalVisible(false)}
        >
          <View style={[styles.biometricModalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.vaultShieldIconBox}>
              <Ionicons name="shield-checkmark" size={48} color={theme.primary} />
              <View style={styles.glowDot}>
                <Ionicons name="finger-print" size={20} color={theme.primary} />
              </View>
            </View>
            <Text style={[styles.biometricModalTitle, { color: theme.text }]}>
              Biometric Authentication
            </Text>
            <Text style={[styles.biometricModalDesc, { color: theme.textMuted }]}>
              Authenticate with your fingerprint or face to unlock the vault and decrypt your media.
            </Text>
            <TouchableOpacity
              style={[styles.biometricModalBtn, { backgroundColor: theme.primary }]}
              onPress={handleBiometricUnlock}
              disabled={biometricLoading}
              activeOpacity={0.8}
            >
              {biometricLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="finger-print" size={20} color="#FFF" />
                  <Text style={styles.biometricModalBtnText}>UNLOCK VAULT</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.biometricModalCancel}
              onPress={() => setBiometricModalVisible(false)}
            >
              <Text style={[styles.biometricModalCancelText, { color: theme.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  vaultCoreWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  shieldGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  cyberRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  shieldCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: Platform.select({ android: 'sans-serif-medium', ios: 'System' }),
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.select({ android: 'sans-serif-medium', ios: 'System' }),
  },
  lockedDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 16,
    fontFamily: Platform.select({ android: 'sans-serif', ios: 'System' }),
  },
  pinInputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  pinInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 56,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pinInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.select({ android: 'sans-serif-medium', ios: 'System' }),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  authMainBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  authMainBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: Platform.select({ android: 'sans-serif-medium', ios: 'System' }),
  },
  biometricBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
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
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  statsCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  encryptPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  encryptPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  vaultCard: {
    width: (SCREEN_WIDTH - 50) / 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  vaultThumbBox: {
    width: '100%',
    height: 144,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  vaultThumbImg: {
    width: '100%',
    height: '100%',
  },
  cipherIconBox: {
    alignItems: 'center',
    gap: 6,
  },
  cipherLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  secureTagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  secureTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  vaultCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  vaultFileName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  vaultFileSize: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardMenuBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  importMenuBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  importMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  importMenuTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  importMenuSubtitle: {
    fontSize: 12,
    marginBottom: 18,
  },
  importOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  importIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  importOptionSub: {
    fontSize: 11,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Biometric Modal Styles
  biometricModalBox: {
    marginHorizontal: 24,
    marginBottom: 40,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  vaultShieldIconBox: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  glowDot: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  biometricModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  biometricModalDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  biometricModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  biometricModalBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  biometricModalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  biometricModalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
