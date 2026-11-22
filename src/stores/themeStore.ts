// ==============================================================================
// NEXORA THEME STORE (Zustand)
// Supports Built-in Themes & Dynamic Custom Color Palettes with Persistence
// ==============================================================================

import { create } from 'zustand';
import { THEMES, DEFAULT_THEME_ID } from '../constants/themes';
import { ThemeColors } from '../types';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const THEME_STORAGE_KEY = 'ak_app_theme_id';
const CUSTOM_PALETTE_STORAGE_KEY = 'ak_custom_palette';

function isDarkColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return true;
  const clean = hex.slice(1);
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

function adjustBrightness(hex: string, percent: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex;
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function buildCustomTheme(
  primary = '#6366F1',
  accent = '#EC4899',
  background = '#0B0D17',
  surface = '#151928'
): ThemeColors {
  const isDark = isDarkColor(background);
  return {
    id: 'custom',
    name: 'Custom Palette',
    isDark,
    background,
    surface,
    surfaceHover: adjustBrightness(surface, isDark ? 10 : -10),
    card: adjustBrightness(surface, isDark ? 6 : -6),
    border: adjustBrightness(surface, isDark ? 20 : -20),
    primary,
    primaryGlow: `${primary}55`,
    secondary: accent,
    accent,
    text: isDark ? '#F8FAFC' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    textSubtle: isDark ? '#64748B' : '#94A3B8',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    badge: `${primary}26`,
  };
}

interface ThemeState {
  currentThemeId: string;
  theme: ThemeColors;
  customPalette: { primary: string; accent: string; background: string; surface: string } | null;
  setTheme: (themeId: string) => Promise<void>;
  applyCustomPalette: (palette: { primary: string; accent: string; background: string; surface: string }) => Promise<void>;
  availableThemes: ThemeColors[];
  loadSavedTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentThemeId: DEFAULT_THEME_ID,
  theme: THEMES[DEFAULT_THEME_ID],
  customPalette: null,
  availableThemes: Object.values(THEMES),

  setTheme: async (themeId: string) => {
    if (THEMES[themeId]) {
      set({
        currentThemeId: themeId,
        theme: THEMES[themeId],
      });
      try {
        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync(THEME_STORAGE_KEY, themeId);
        }
      } catch (_) {}
    }
  },

  applyCustomPalette: async (palette) => {
    const customTheme = buildCustomTheme(palette.primary, palette.accent, palette.background, palette.surface);
    set({
      currentThemeId: 'custom',
      theme: customTheme,
      customPalette: palette,
    });
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(THEME_STORAGE_KEY, 'custom');
        await SecureStore.setItemAsync(CUSTOM_PALETTE_STORAGE_KEY, JSON.stringify(palette));
      }
    } catch (_) {}
  },

  loadSavedTheme: async () => {
    try {
      if (Platform.OS === 'web') return;
      const savedThemeId = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (savedThemeId === 'custom') {
        const savedPaletteStr = await SecureStore.getItemAsync(CUSTOM_PALETTE_STORAGE_KEY);
        if (savedPaletteStr) {
          const pal = JSON.parse(savedPaletteStr);
          const customTheme = buildCustomTheme(pal.primary, pal.accent, pal.background, pal.surface);
          set({
            currentThemeId: 'custom',
            theme: customTheme,
            customPalette: pal,
          });
          return;
        }
      } else if (savedThemeId && THEMES[savedThemeId]) {
        set({
          currentThemeId: savedThemeId,
          theme: THEMES[savedThemeId],
        });
      }
    } catch (_) {}
  },
}));

// Automatically attempt to load saved theme
void useThemeStore.getState().loadSavedTheme();
