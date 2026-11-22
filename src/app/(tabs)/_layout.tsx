// ==============================================================================
// AK APP BOTTOM TAB NAVIGATOR
// Clean, minimal floating tabs with subtle active state
// ==============================================================================

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Platform } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';

export default function TabLayout() {
  const { theme } = useThemeStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 60 : 50,
          paddingBottom: Platform.OS === 'ios' ? 14 : 8,
          paddingTop: 6,
          elevation: 0,
          shadowColor: 'transparent',
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }: any) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: 'Files',
          tabBarIcon: ({ color, focused }: any) => (
            <Ionicons
              name={focused ? 'folder' : 'folder-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }: any) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: 'Music',
          tabBarIcon: ({ color, focused }: any) => (
            <Ionicons
              name={focused ? 'headset' : 'headset-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Downloads',
          tabBarIcon: ({ color, focused }: any) => (
            <Ionicons
              name={focused ? 'download' : 'download-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }: any) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
