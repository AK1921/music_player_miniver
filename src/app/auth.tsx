// ==============================================================================
// NEXORA AUTH & SUPABASE CONNECTION SCREEN
// ==============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import { isConfigured } from '../services/supabase';

export default function AuthScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const {
    user,
    signIn,
    signUp,
    signOut,
    authenticateWithBiometrics,
    hasBiometrics,
    error,
    isLoading,
  } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup' | 'setup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuthAction = async () => {
    if (!email || !password) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    if (mode === 'signup') {
      const ok = await signUp(email.trim(), password, fullName.trim() || 'AK User');
      if (ok) {
        Alert.alert('Account Created', 'Your AK media ecosystem account is ready.');
        router.back();
      }
    } else {
      const ok = await signIn(email.trim(), password);
      if (ok) {
        router.back();
      }
    }
  };

  const handleBiometricAuth = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {user ? 'PROFILE & SECURITY' : 'AUTHENTICATION'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {user ? (
          /* Logged In View */
          <View style={styles.profileSection}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primaryGlow }]}>
              <Ionicons name="person" size={48} color={theme.primary} />
            </View>

            <Text style={[styles.profileName, { color: theme.text }]}>{user.fullName}</Text>
            <Text style={[styles.profileEmail, { color: theme.textMuted }]}>{user.email}</Text>

            <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSubtle }]}>Status:</Text>
                <Text style={[styles.infoValue, { color: theme.success }]}>
                  {isConfigured ? 'Connected to Supabase' : 'Offline / Demo Session'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSubtle }]}>Storage Quota:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {(user.storageUsedBytes / 1048576).toFixed(1)} MB / 1,024 MB
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSubtle }]}>Row Level Security:</Text>
                <Text style={[styles.infoValue, { color: theme.primary }]}>Enforced (100% auth.uid())</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signOutBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: theme.danger }]}
              onPress={signOut}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.danger} />
              <Text style={[styles.signOutText, { color: theme.danger }]}>LOG OUT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Sign In / Sign Up View */
          <View style={styles.authForm}>
            <View style={[styles.iconBox, { backgroundColor: theme.primaryGlow }]}>
              <Ionicons name="cloud-done" size={42} color={theme.primary} />
            </View>

            <Text style={[styles.authTitle, { color: theme.text }]}>
              {mode === 'signup' ? 'CREATE AK ACCOUNT' : 'SECURE SIGN IN'}
            </Text>
            <Text style={[styles.authSubtitle, { color: theme.textMuted }]}>
              Protected by PostgreSQL Row-Level Security & AES-256
            </Text>

            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSubtle }]}>FULL NAME</Text>
                <TextInput
                  placeholder="e.g. Alex Hunter"
                  placeholderTextColor={theme.textSubtle}
                  value={fullName}
                  onChangeText={setFullName}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSubtle }]}>EMAIL ADDRESS</Text>
              <TextInput
                placeholder="creator@akmedia.io"
                placeholderTextColor={theme.textSubtle}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSubtle }]}>PASSWORD</Text>
              <TextInput
                placeholder="••••••••••••"
                placeholderTextColor={theme.textSubtle}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              />
            </View>

            {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleAuthAction}
              disabled={isLoading}
            >
              <Text style={styles.submitBtnText}>
                {mode === 'signup' ? 'REGISTER ACCOUNT' : 'SIGN IN'}
              </Text>
            </TouchableOpacity>

            {hasBiometrics && (
              <TouchableOpacity
                style={[styles.biometricBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleBiometricAuth}
              >
                <Ionicons name="finger-print" size={24} color={theme.primary} />
                <Text style={[styles.biometricBtnText, { color: theme.text }]}>
                  FAST SIGN IN WITH BIOMETRICS
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.switchModeRow}>
              <Text style={[styles.switchModeText, { color: theme.textMuted }]}>
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity
                onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              >
                <Text style={[styles.switchModeLink, { color: theme.primary }]}>
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Supabase Free-Tier Setup Blueprint Card */}
        <View style={[styles.setupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.setupHeader}>
            <Ionicons name="information-circle" size={22} color={theme.primary} />
            <Text style={[styles.setupTitle, { color: theme.text }]}>SUPABASE CONNECTION GUIDE</Text>
          </View>
          <Text style={[styles.setupDesc, { color: theme.textMuted }]}>
            To link your own cloud instance:
          </Text>
          <Text style={[styles.setupStep, { color: theme.text }]}>
            1. Create a free project at <Text style={{ color: theme.primary }}>supabase.com</Text> using our generated 32-character master password.
          </Text>
          <Text style={[styles.setupStep, { color: theme.text }]}>
            2. Open Supabase SQL Editor and run <Text style={{ color: theme.accent }}>supabase/migrations/20240101000000_nexora_schema.sql</Text>.
          </Text>
          <Text style={[styles.setupStep, { color: theme.text }]}>
            3. Paste your Project URL and Anon Key into <Text style={{ color: theme.accent }}>.env</Text>.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
  infoCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  authForm: {
    alignItems: 'center',
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  authSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  biometricBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  biometricBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  switchModeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
    marginBottom: 24,
  },
  switchModeText: {
    fontSize: 13,
  },
  switchModeLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  setupCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  setupDesc: {
    fontSize: 12,
    marginBottom: 8,
  },
  setupStep: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
});

