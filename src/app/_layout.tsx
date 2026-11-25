// ==============================================================================
// NEXORA ROOT LAYOUT (Expo Router + Gesture Handler + Theme Provider)
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  AppState,
  AppStateStatus,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import { useVaultStore } from '../stores/vaultStore';
import { usePlayerStore } from '../stores/playerStore';
import { NowPlayingModal } from '../components/player/NowPlayingModal';
import { MiniPlayerBar } from '../components/player/MiniPlayerBar';
import { YouTubeAudioBridge } from '../components/player/YouTubeAudioBridge';

export default function RootLayout() {
  const { theme } = useThemeStore();
  const {
    initialize: initAuth,
    appBiometricsEnabled,
    isAppLocked,
    unlockAppWithBiometrics,
    unlockAppWithPin,
  } = useAuthStore();
  const { lockVault } = useVaultStore();
  const { initializeAudio } = usePlayerStore();

  const [mobilePinInput, setMobilePinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  useEffect(() => {
    // Global error safety handler
    if (typeof (globalThis as any).ErrorUtils !== 'undefined') {
      const defaultHandler =
        (globalThis as any).ErrorUtils.getGlobalHandler && (globalThis as any).ErrorUtils.getGlobalHandler();
      (globalThis as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        console.log('[AK SafeHandler] Caught error:', error?.message);
        if (!isFatal && defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
    }

    initAuth();
    initializeAudio();

    // Auto-lock vault and app when going to background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          lockVault();
          if (useAuthStore.getState().appBiometricsEnabled) {
            useAuthStore.setState({ isAppLocked: true });
          }
        } catch (e) {}
      } else if (nextAppState === 'active') {
        if (useAuthStore.getState().appBiometricsEnabled && useAuthStore.getState().isAppLocked) {
          useAuthStore.getState().unlockAppWithBiometrics();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <View style={[styles.root, { backgroundColor: theme.background }]}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="recycle-bin"
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="games"
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="notes-tasks"
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="auth"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </Stack>

          {/* Persistent Headless YouTube Audio Bridge */}
          <YouTubeAudioBridge />

          {/* Persistent Floating Mini-Player */}
          <MiniPlayerBar />

          {/* Fullscreen Now Playing Modal */}
          <NowPlayingModal />

          {/* Full-Screen Physical Device Biometric App Lock Modal - Premium Frost Opal Security Interface */}
          <Modal
            visible={appBiometricsEnabled && isAppLocked}
            transparent={false}
            animationType="fade"
            presentationStyle="fullScreen"
          >
            <View style={[styles.lockScreen, { backgroundColor: theme.background }]}>
              <View style={[styles.lockCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Security Badge */}
                <View style={[styles.securityBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.securityBadgeText, { color: theme.accent }]}>FROST OPAL SECURED</Text>
                </View>

                <TouchableOpacity
                  style={[styles.fingerprintRing, { borderColor: theme.primary, backgroundColor: theme.primaryGlow }]}
                  onPress={() => unlockAppWithBiometrics()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="finger-print" size={56} color={theme.primary} />
                </TouchableOpacity>

                <Text style={[styles.lockTitle, { color: theme.text }]}>AK STUDIO SECURED</Text>
                <Text style={[styles.lockSubtitle, { color: theme.textMuted }]}>
                  Touch physical fingerprint sensor or enter master PIN to unlock.
                </Text>

                <TouchableOpacity
                  style={[styles.bioActionBtn, { backgroundColor: theme.primary }]}
                  onPress={() => unlockAppWithBiometrics()}
                >
                  <Ionicons name="finger-print" size={18} color="#FFF" />
                  <Text style={styles.bioActionText}>Scan Fingerprint</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 14, padding: 8 }}
                  onPress={() => setShowPinInput(!showPinInput)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>
                    {showPinInput ? 'Hide PIN Input' : 'Or Enter Master PIN'}
                  </Text>
                </TouchableOpacity>

                {showPinInput && (
                  <View style={{ width: '100%', marginTop: 12 }}>
                    <TextInput
                      placeholder="Master PIN (2003 / arif)"
                      placeholderTextColor={theme.textSubtle}
                      secureTextEntry
                      value={mobilePinInput}
                      onChangeText={setMobilePinInput}
                      style={[styles.pinInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                    />
                    <TouchableOpacity
                      style={[styles.pinSubmitBtn, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        const ok = unlockAppWithPin(mobilePinInput);
                        if (ok) {
                          setMobilePinInput('');
                        } else {
                          Alert.alert('Incorrect PIN', 'Use master PIN: 2003 or arif.');
                        }
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>UNLOCK WITH PIN</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 32,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
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
  },
  fingerprintRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  lockSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  bioActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  bioActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pinInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 12,
  },
  pinSubmitBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
});
