// ==============================================================================
// NEXORA RECYCLE BIN & AUDIT HISTORY SCREEN
// File restoration, permanent eradication, 30-day retention policy & logs
// ==============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../stores/themeStore';
import { useMediaStore } from '../stores/mediaStore';

export default function RecycleBinScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const {
    getRecycleBinFiles,
    restoreFiles,
    permanentlyDeleteFiles,
    emptyRecycleBin,
    activityLogs,
  } = useMediaStore();

  const [activeTab, setActiveTab] = useState<'bin' | 'logs'>('bin');

  const binFiles = getRecycleBinFiles();

  const handleRestore = (id: string) => {
    restoreFiles([id]);
  };

  const handlePermanentDelete = (id: string) => {
    Alert.alert('Permanently Erase', 'This file will be permanently deleted from the cloud storage.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => permanentlyDeleteFiles([id]) },
    ]);
  };

  const handleEmptyBin = () => {
    Alert.alert(
      'Empty Recycle Bin',
      `Permanently delete all ${binFiles.length} file(s) from cloud storage? This action cannot be reversed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Empty Bin', style: 'destructive', onPress: emptyRecycleBin },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerSubtitle, { color: theme.danger }]}>RETENTION POLICY: 30 DAYS</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>RECYCLE BIN</Text>
        </View>
        {binFiles.length > 0 && activeTab === 'bin' ? (
          <TouchableOpacity onPress={handleEmptyBin} style={styles.emptyBtn}>
            <Text style={[styles.emptyBtnText, { color: theme.danger }]}>EMPTY</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            { borderBottomColor: activeTab === 'bin' ? theme.primary : 'transparent' },
          ]}
          onPress={() => setActiveTab('bin')}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'bin' ? theme.primary : theme.textMuted },
            ]}
          >
            Deleted Files ({binFiles.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            { borderBottomColor: activeTab === 'logs' ? theme.primary : 'transparent' },
          ]}
          onPress={() => setActiveTab('logs')}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'logs' ? theme.primary : theme.textMuted },
            ]}
          >
            Audit History Logs
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'bin' ? (
          binFiles.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="trash-outline" size={54} color={theme.textSubtle} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Recycle Bin is Empty</Text>
              <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
                Files you soft-delete will stay here for 30 days before permanent purging.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {binFiles.map(file => (
                <View
                  key={file.id}
                  style={[styles.binItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.binThumb, { backgroundColor: theme.surface }]}>
                    <Ionicons
                      name={
                        file.fileType === 'image'
                          ? 'image'
                          : file.fileType === 'video'
                          ? 'film'
                          : file.fileType === 'audio'
                          ? 'musical-notes'
                          : 'document-text'
                      }
                      size={22}
                      color={theme.primary}
                    />
                  </View>

                  <View style={styles.binMeta}>
                    <Text style={[styles.binTitle, { color: theme.text }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={[styles.binSub, { color: theme.textSubtle }]}>
                      {formatFileSize(file.sizeBytes)} • Deleted: {new Date(file.deletedAt || file.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.binActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.primaryGlow }]}
                      onPress={() => handleRestore(file.id)}
                    >
                      <Ionicons name="refresh" size={18} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                      onPress={() => handlePermanentDelete(file.id)}
                    >
                      <Ionicons name="trash" size={18} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          /* Audit History Logs */
          <View style={styles.logsList}>
            {activityLogs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="newspaper-outline" size={48} color={theme.textSubtle} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Activity Recorded</Text>
              </View>
            ) : (
              activityLogs.map((log, i) => (
                <View
                  key={`log-${log.id}-${i}`}
                  style={[styles.logRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Ionicons
                    name={
                      log.action === 'upload'
                        ? 'cloud-upload'
                        : log.action === 'restore'
                        ? 'refresh'
                        : 'trash'
                    }
                    size={20}
                    color={
                      log.action === 'upload'
                        ? theme.success
                        : log.action === 'restore'
                        ? theme.primary
                        : theme.danger
                    }
                  />
                  <View style={styles.logMeta}>
                    <Text style={[styles.logAction, { color: theme.text }]}>
                      Action: {log.action.toUpperCase()}
                    </Text>
                    <Text style={[styles.logTime, { color: theme.textSubtle }]}>
                      {new Date(log.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyBtn: {
    padding: 6,
  },
  emptyBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 20,
  },
  tabItem: {
    paddingVertical: 10,
    borderBottomWidth: 3,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  list: {
    gap: 10,
  },
  binItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  binThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  binMeta: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  binTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  binSub: {
    fontSize: 11,
    marginTop: 2,
  },
  binActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsList: {
    gap: 8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  logMeta: {
    flex: 1,
    marginLeft: 12,
  },
  logAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  logTime: {
    fontSize: 11,
    marginTop: 2,
  },
});

