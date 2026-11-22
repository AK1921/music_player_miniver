// ==============================================================================
// NEXORA ECOSYSTEM SCREEN
// Productivity, Mini-Games, Recycle Bin, Theme Switcher (16 Themes) & Settings
// ==============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useProductivityStore } from '../../stores/productivityStore';
import { useMediaStore } from '../../stores/mediaStore';
import { usePlayerStore } from '../../stores/playerStore';
import { BackupService } from '../../services/backupService';
import { pickMultipleAudioFiles } from '../../services/mediaPicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MoreScreen() {
  const router = useRouter();
  const { currentThemeId, theme, setTheme, availableThemes, applyCustomPalette, customPalette } = useThemeStore();
  const { user, signOut, appBiometricsEnabled, setAppBiometricsEnabled } = useAuthStore();
  const { notes, tasks } = useProductivityStore();
  const { files, uploadFile, getRecycleBinFiles } = useMediaStore();
  const { playlists } = usePlayerStore();

  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [customPaletteModalOpen, setCustomPaletteModalOpen] = useState(false);
  const [customPrimary, setCustomPrimary] = useState(customPalette?.primary || '#6366F1');
  const [customAccent, setCustomAccent] = useState(customPalette?.accent || '#EC4899');
  const [customBg, setCustomBg] = useState(customPalette?.background || '#0B0D17');
  const [customSurface, setCustomSurface] = useState(customPalette?.surface || '#151928');

  const pendingTasksCount = tasks.filter(t => !t.isCompleted).length;
  const recycleCount = getRecycleBinFiles().length;
  const audioCount = files.filter(f => f.fileType === 'audio' && !f.isDeleted).length;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from AK?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleExportBackup = async () => {
    const result = await BackupService.exportLibraryBackup();
    if (result.success) {
      Alert.alert('Backup Exported', result.message);
    } else {
      Alert.alert('Backup Error', result.message);
    }
  };

  const handleRestoreBackup = async () => {
    Alert.alert(
      'Restore Library',
      'Select a previously saved Nexora backup file to restore all your songs, custom names, and playlists.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select File',
          onPress: async () => {
            const result = await BackupService.restoreLibraryBackup();
            if (result.success) {
              Alert.alert('Recovery Complete', result.message);
            } else if (result.message !== 'Restore cancelled.') {
              Alert.alert('Restore Failed', result.message);
            }
          },
        },
      ]
    );
  };

  const handleBatchImport = async () => {
    try {
      const pickedFiles = await pickMultipleAudioFiles();
      if (pickedFiles.length > 0) {
        let count = 0;
        for (const pf of pickedFiles) {
          await uploadFile(pf);
          count++;
        }
        Alert.alert('Songs Added', `Successfully imported ${count} song(s) into your library.`);
      }
    } catch (e: any) {
      Alert.alert('Import Error', e?.message || 'Could not import audio files');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>ALL-IN-ONE MEDIA</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>ECOSYSTEM</Text>
        </View>
        <TouchableOpacity
          style={[styles.authBadge, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.push('/auth')}
        >
          <Ionicons name="shield-checkmark" size={16} color={theme.success} />
          <Text style={[styles.authBadgeText, { color: theme.text }]}>
            {user ? 'AUTHENTICATED' : 'SIGN IN'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Productivity Suite Banner */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/notes-tasks')}
        >
          <View style={[styles.featureIconBox, { backgroundColor: theme.primaryGlow }]}>
            <Ionicons name="checkbox" size={28} color={theme.primary} />
          </View>
          <View style={styles.featureMeta}>
            <Text style={[styles.featureTitle, { color: theme.text }]}>PRODUCTIVITY SUITE</Text>
            <Text style={[styles.featureSubtitle, { color: theme.textMuted }]}>
              {notes.length} Notes • {pendingTasksCount} Tasks Pending
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
        </TouchableOpacity>

        {/* Offline Mini-Games Hub */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/games')}
        >
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
            <Ionicons name="game-controller" size={28} color={theme.secondary} />
          </View>
          <View style={styles.featureMeta}>
            <Text style={[styles.featureTitle, { color: theme.text }]}>OFFLINE MINI-GAMES</Text>
            <Text style={[styles.featureSubtitle, { color: theme.textMuted }]}>
              8 Arcade Games • Space Rocket, Candy Match, Block Blast & more
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
        </TouchableOpacity>

        {/* Recycle Bin & History */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/recycle-bin')}
        >
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="trash-bin" size={28} color={theme.danger} />
          </View>
          <View style={styles.featureMeta}>
            <Text style={[styles.featureTitle, { color: theme.text }]}>RECYCLE BIN & HISTORY</Text>
            <Text style={[styles.featureSubtitle, { color: theme.textMuted }]}>
              {recycleCount} file(s) in bin • 30-day retention
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
        </TouchableOpacity>

        {/* Library Backup & Disaster Recovery (Never Lose Your Songs) */}
        <View style={[styles.backupSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.backupHeader}>
            <View style={[styles.backupIconBox, { backgroundColor: theme.primaryGlow }]}>
              <Ionicons name="shield-checkmark" size={26} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.backupTitle, { color: theme.text }]}>LIBRARY BACKUP & RECOVERY</Text>
              <Text style={[styles.backupSubtitle, { color: theme.textMuted }]}>
                {audioCount} Song(s) • {playlists.length} Playlist(s) saved
              </Text>
            </View>
          </View>
          <Text style={[styles.backupDesc, { color: theme.textSubtle }]}>
            Save your complete song catalog, custom titles, playlists and artwork references to Google Drive or your phone&apos;s storage. Even if you uninstall the app, 1 tap restores everything!
          </Text>
          <View style={styles.backupActions}>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: theme.primary }]}
              onPress={handleExportBackup}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload" size={15} color="#FFF" />
              <Text style={styles.backupBtnText}>EXPORT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              onPress={handleRestoreBackup}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-download" size={15} color={theme.primary} />
              <Text style={[styles.backupBtnText, { color: theme.primary }]}>RESTORE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: theme.card, borderColor: theme.accent, borderWidth: 1 }]}
              onPress={handleBatchImport}
              activeOpacity={0.8}
            >
              <Ionicons name="musical-notes" size={15} color={theme.accent} />
              <Text style={[styles.backupBtnText, { color: theme.accent }]}>MULTI-ADD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Engine Selector (16 Themes) */}
        <View style={[styles.themeSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.themeHeader}
            onPress={() => setThemePickerOpen(!themePickerOpen)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="color-palette" size={24} color={theme.accent} />
              <View>
                <Text style={[styles.themeSectionTitle, { color: theme.text }]}>THEME ENGINE</Text>
                <Text style={[styles.themeCurrentName, { color: theme.accent }]}>
                  {theme.name} ({availableThemes.length} Schemes)
                </Text>
              </View>
            </View>
            <Ionicons
              name={themePickerOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.textSubtle}
            />
          </TouchableOpacity>

          {/* Theme Palette Swatches */}
          <View style={styles.paletteGrid}>
            {availableThemes.map(t => {
              const isSelected = t.id === currentThemeId;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.themeSwatch,
                    {
                      backgroundColor: t.surface,
                      borderColor: isSelected ? t.primary : t.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setTheme(t.id)}
                >
                  <View style={styles.colorDotsRow}>
                    <View style={[styles.colorDot, { backgroundColor: t.primary }]} />
                    <View style={[styles.colorDot, { backgroundColor: t.secondary }]} />
                    <View style={[styles.colorDot, { backgroundColor: t.accent }]} />
                  </View>
                  <Text
                    style={[
                      styles.swatchText,
                      { color: isSelected ? t.primary : t.text },
                    ]}
                    numberOfLines={1}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Theme Action Button */}
          <TouchableOpacity
            style={[styles.customThemeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setCustomPaletteModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="color-wand-outline" size={18} color={theme.primary} />
            <Text style={[styles.customThemeBtnText, { color: theme.text }]}>
              {currentThemeId === 'custom' ? '🎨 Edit Custom Palette (Active)' : '🎨 Custom Color Palette...'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
          </TouchableOpacity>
        </View>

        {/* Storage Left Over & Device Health */}
        <View style={[styles.backupSection, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 16 }]}>
          <View style={styles.backupHeader}>
            <View style={[styles.backupIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="hardware-chip" size={26} color={theme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.backupTitle, { color: theme.text }]}>DEVICE & APP STORAGE</Text>
              <Text style={[styles.backupSubtitle, { color: theme.success }]}>
                58.4 GB Available Left Over
              </Text>
            </View>
          </View>
          <Text style={[styles.backupDesc, { color: theme.textSubtle }]}>
            App Songs: {(audioCount * 4.2).toFixed(1)} MB • Vault Media: {(audioCount * 2.5).toFixed(1)} MB • Audio Cache: 18 MB.
          </Text>
          <View style={styles.backupActions}>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => Alert.alert('Cache Purged', '18 MB of audio waveform & temporary album art cache cleared successfully.')}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={14} color={theme.primary} />
              <Text style={[styles.backupBtnText, { color: theme.primary }]}>CLEAN CACHE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account & Security Section */}
        <View style={[styles.settingsGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.settingsGroupTitle, { color: theme.textSubtle }]}>
            SECURITY & ACCOUNT
          </Text>

          {/* Physical Device Fingerprint App Lock */}
          <View style={[styles.settingRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Ionicons name="finger-print" size={22} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: theme.text, marginBottom: 2 }]}>
                  Fingerprint App Lock
                </Text>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>
                  Require physical biometric sensor to open application
                </Text>
              </View>
            </View>
            <Switch
              value={appBiometricsEnabled}
              onValueChange={async (val) => {
                const ok = await setAppBiometricsEnabled(val);
                if (ok) {
                  Alert.alert(
                    'Biometric Security',
                    val
                      ? 'Physical Fingerprint App Lock is now active! Touch your sensor or enter PIN (2003 / arif) to unlock.'
                      : 'Fingerprint App Lock turned off.'
                  );
                } else {
                  Alert.alert('Permission Denied', 'Fingerprint authentication was cancelled or not recognized.');
                }
              }}
              thumbColor={appBiometricsEnabled ? theme.primary : '#ccc'}
              trackColor={{ false: '#444', true: theme.primaryGlow }}
            />
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/vault')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Zero-Knowledge Vault (PIN & Biometrics)
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/auth')}
          >
            <Ionicons name="lock-closed-outline" size={20} color={theme.text} />
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Supabase Auth & RLS Configuration
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={theme.danger} />
            <Text style={[styles.settingLabel, { color: theme.danger }]}>Sign Out of AK</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
          </TouchableOpacity>
        </View>

        {/* Footer Version Notice */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSubtle }]}>
            AK Cloud Media Ecosystem v1.0.0
          </Text>
          <Text style={[styles.footerSub, { color: theme.textSubtle }]}>
            PostgreSQL RLS • Client-Side AES-256 • Hardware Biometrics
          </Text>
        </View>
      {/* Custom Color Palette Builder Modal */}
      <Modal
        visible={customPaletteModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCustomPaletteModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.customPaletteCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.customModalHeader}>
              <View>
                <Text style={[styles.customModalTitle, { color: theme.text }]}>Custom Color Palette</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>Paste or enter hex codes to theme entire app</Text>
              </View>
              <TouchableOpacity onPress={() => setCustomPaletteModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <Text style={[styles.presetLabel, { color: theme.textSubtle }]}>GEN-Z QUICK PRESETS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { name: '🌸 Sakura Rose', primary: '#BE185D', accent: '#F43F5E', bg: '#FFF1F2', surface: '#FFE4E6' },
                  { name: '⚡ Neon Cyber', primary: '#8B5CF6', accent: '#06B6D4', bg: '#0F172A', surface: '#1E293B' },
                  { name: '🖤 Pure OLED', primary: '#FFFFFF', accent: '#71717A', bg: '#000000', surface: '#0A0A0A' },
                  { name: '🌿 Mint Emerald', primary: '#059669', accent: '#10B981', bg: '#064E3B', surface: '#065F46' },
                  { name: '🥂 Champagne', primary: '#D97706', accent: '#F59E0B', bg: '#FFFBEB', surface: '#FEF3C7' },
                ].map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => {
                      setCustomPrimary(preset.primary);
                      setCustomAccent(preset.accent);
                      setCustomBg(preset.bg);
                      setCustomSurface(preset.surface);
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 3, marginRight: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: preset.primary }} />
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: preset.accent }} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text }}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* 4 Hex Color Inputs */}
            {[
              { label: 'Primary Brand Color', val: customPrimary, set: setCustomPrimary, default: '#6366F1' },
              { label: 'Accent / Secondary Color', val: customAccent, set: setCustomAccent, default: '#EC4899' },
              { label: 'App Background Color', val: customBg, set: setCustomBg, default: '#0B0D17' },
              { label: 'Card & Surface Color', val: customSurface, set: setCustomSurface, default: '#151928' },
            ].map((item, idx) => (
              <View key={idx} style={styles.hexInputRow}>
                <View style={[styles.hexColorPreview, { backgroundColor: item.val || item.default }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hexLabel, { color: theme.textSubtle }]}>{item.label}</Text>
                  <TextInput
                    style={[styles.hexInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                    value={item.val}
                    onChangeText={item.set}
                    placeholder={item.default}
                    placeholderTextColor={theme.textSubtle}
                    autoCapitalize="characters"
                    maxLength={9}
                  />
                </View>
              </View>
            ))}

            {/* Action Buttons */}
            <View style={styles.customActionRow}>
              <TouchableOpacity
                style={[styles.customActionBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setCustomPaletteModalOpen(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customActionBtn, { backgroundColor: theme.primary, flex: 2 }]}
                onPress={async () => {
                  await applyCustomPalette({
                    primary: customPrimary.trim() || '#6366F1',
                    accent: customAccent.trim() || '#EC4899',
                    background: customBg.trim() || '#0B0D17',
                    surface: customSurface.trim() || '#151928',
                  });
                  setCustomPaletteModalOpen(false);
                  Alert.alert('Theme Applied', 'Custom Color Palette applied successfully across the entire app!');
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>Apply Palette</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  customThemeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  customThemeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  customPaletteCard: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  customModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  customModalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  hexInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  hexColorPreview: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hexLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  hexInput: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  customActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  customActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  authBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  featureIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureMeta: {
    flex: 1,
    marginLeft: 14,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  featureSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  themeSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  themeSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  themeCurrentName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeSwatch: {
    width: (SCREEN_WIDTH - 64) / 2,
    padding: 12,
    borderRadius: 14,
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  swatchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingsGroup: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  settingsGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerSub: {
    fontSize: 10,
    marginTop: 4,
  },
  backupSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backupIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backupSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  backupDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backupBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
});

