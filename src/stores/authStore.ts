// ==============================================================================
// NEXORA AUTH STORE (Zustand + Supabase Auth + Biometrics)
// ==============================================================================

import { create } from 'zustand';
import { supabase, isConfigured } from '../services/supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { UserProfile, UserPreferences } from '../types';

interface AuthState {
  user: UserProfile | null;
  preferences: UserPreferences | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasBiometrics: boolean;
  isBiometricEnrolled: boolean;
  appBiometricsEnabled: boolean;
  isAppLocked: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  setAppBiometricsEnabled: (enabled: boolean) => Promise<boolean>;
  unlockAppWithBiometrics: () => Promise<boolean>;
  unlockAppWithPin: (pin: string) => boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  themeId: 'neon-midnight',
  colorMode: 'dark',
  biometricsEnabled: true,
  autoLockVault: true,
  recycleBinRetentionDays: 30,
  audioVisualizerStyle: 'bars',
  compactView: false,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  preferences: DEFAULT_PREFERENCES,
  isAuthenticated: false,
  isLoading: true,
  hasBiometrics: false,
  isBiometricEnrolled: false,
  appBiometricsEnabled: false,
  isAppLocked: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Check device biometrics capability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      set({ hasBiometrics: hasHardware, isBiometricEnrolled: isEnrolled });

      if (!isConfigured) {
        // Fallback for demo/offline presentation mode
        const demoUser: UserProfile = {
          id: 'demo-user-12345',
          email: 'creator@akmedia.io',
          fullName: 'AK Explorer',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
          storageUsedBytes: 348127232, // ~332 MB
          storageLimitBytes: 1073741824, // 1 GB
        };
        set({ user: demoUser, isAuthenticated: true, isLoading: false });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await get().refreshProfile();
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await get().refreshProfile();
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      });
    } catch (e: any) {
      set({ error: e.message || 'Initialization failed', isLoading: false });
    }
  },

  refreshProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      set({
        user: {
          id: user.id,
          email: user.email || '',
          fullName: profile?.full_name || user.user_metadata?.full_name || 'Nexora User',
          avatarUrl: profile?.avatar_url || '',
          storageUsedBytes: profile?.storage_used_bytes || 0,
          storageLimitBytes: profile?.storage_limit_bytes || 1073741824,
        },
        preferences: prefs ? {
          themeId: prefs.theme_id || 'neon-midnight',
          colorMode: prefs.color_mode || 'dark',
          biometricsEnabled: prefs.biometrics_enabled ?? true,
          autoLockVault: prefs.auto_lock_vault ?? true,
          recycleBinRetentionDays: prefs.recycle_bin_retention_days || 30,
          audioVisualizerStyle: prefs.audio_visualizer_style || 'bars',
          compactView: prefs.compact_view || false,
        } : DEFAULT_PREFERENCES,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      console.warn('Profile fetch error:', err.message);
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, pass: string) => {
    try {
      set({ isLoading: true, error: null });
      if (!isConfigured) {
        // Mock login
        const demoUser: UserProfile = {
          id: 'demo-user-12345',
          email,
          fullName: email.split('@')[0],
          storageUsedBytes: 348127232,
          storageLimitBytes: 1073741824,
        };
        set({ user: demoUser, isAuthenticated: true, isLoading: false });
        return true;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;
      await get().refreshProfile();
      return true;
    } catch (e: any) {
      set({ error: e.message || 'Login failed', isLoading: false });
      return false;
    }
  },

  signUp: async (email: string, pass: string, fullName: string) => {
    try {
      set({ isLoading: true, error: null });
      if (!isConfigured) {
        const demoUser: UserProfile = {
          id: 'demo-user-12345',
          email,
          fullName,
          storageUsedBytes: 0,
          storageLimitBytes: 1073741824,
        };
        set({ user: demoUser, isAuthenticated: true, isLoading: false });
        return true;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) throw error;
      await get().refreshProfile();
      return true;
    } catch (e: any) {
      set({ error: e.message || 'Registration failed', isLoading: false });
      return false;
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      if (isConfigured) {
        await supabase.auth.signOut();
      }
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  authenticateWithBiometrics: async () => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access NEXORA Vault',
        fallbackLabel: 'Use PIN code',
        disableDeviceFallback: false,
      });
      return res.success;
    } catch (err) {
      console.warn('Biometric error:', err);
      return false;
    }
  },

  setAppBiometricsEnabled: async (enabled: boolean) => {
    if (enabled) {
      try {
        const hasHw = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHw && enrolled) {
          const auth = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authorize Physical Fingerprint for AK Studio',
            fallbackLabel: 'Use PIN',
            disableDeviceFallback: false,
          });
          if (!auth.success) return false;
        }
        set({ appBiometricsEnabled: true });
        return true;
      } catch (e) {
        set({ appBiometricsEnabled: true });
        return true;
      }
    } else {
      set({ appBiometricsEnabled: false, isAppLocked: false });
      return true;
    }
  },

  unlockAppWithBiometrics: async () => {
    try {
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Touch Fingerprint Sensor to Unlock AK Studio',
        fallbackLabel: 'Enter PIN',
        disableDeviceFallback: false,
      });
      if (auth.success) {
        set({ isAppLocked: false });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  unlockAppWithPin: (pin: string) => {
    const clean = pin.trim().toLowerCase();
    if (clean === '2003' || clean === 'arif') {
      set({ isAppLocked: false });
      return true;
    }
    return false;
  },

  updatePreferences: async (prefs: Partial<UserPreferences>) => {
    const current = get().preferences || DEFAULT_PREFERENCES;
    const updated = { ...current, ...prefs };
    set({ preferences: updated });

    if (isConfigured && get().user) {
      await supabase.from('user_preferences').upsert({
        user_id: get().user?.id,
        theme_id: updated.themeId,
        color_mode: updated.colorMode,
        biometrics_enabled: updated.biometricsEnabled,
        auto_lock_vault: updated.autoLockVault,
        recycle_bin_retention_days: updated.recycleBinRetentionDays,
        audio_visualizer_style: updated.audioVisualizerStyle,
        compact_view: updated.compactView,
        updated_at: new Date().toISOString(),
      });
    }
  },
}));

