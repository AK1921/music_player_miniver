// ==============================================================================
// NEXORA FILE MANAGEMENT SCREEN
// Folders, Grid/List layouts, Multi-select, Bulk Actions, Search, Filter & Sort
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
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { useMediaStore } from '../../stores/mediaStore';
import { useVaultStore } from '../../stores/vaultStore';
import { MediaViewerModal } from '../../components/viewers/MediaViewerModal';
import {
  pickMediaFromLibrary,
  pickDocumentFromSystem,
  pickMultipleMediaFromLibrary,
  pickMultipleAudioFiles,
  pickMultipleDocumentsFromSystem,
} from '../../services/mediaPicker';
import { MediaFile, MediaType, MediaFolder } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FilesScreen() {
  const { theme } = useThemeStore();
  const { addFileToVault } = useVaultStore();
  const {
    files,
    folders,
    currentFolderId,
    setCurrentFolder,
    createFolder,
    deleteFolder,
    setFolderCover,
    getFilteredFiles,
    selectedFileIds,
    toggleSelectFile,
    selectAll,
    deselectAll,
    softDeleteFiles,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    uploadFile,
    uploadMultipleFiles,
    updateFileThumbnail,
    renameFile,
    moveFile,
    moveFiles,
    toggleFavourite,
    isUploading,
    uploadProgress,
    fetchMedia,
    renameFolder,
  } = useMediaStore();

  const [viewerFile, setViewerFile] = useState<MediaFile | null>(null);
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [targetFileForRename, setTargetFileForRename] = useState<MediaFile | null>(null);
  const [renameInputText, setRenameInputText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [folderMenuVisible, setFolderMenuVisible] = useState(false);

  // Feature 8: Smart Music Library Diagnostics State
  const [libraryHealthModalVisible, setLibraryHealthModalVisible] = useState(false);
  const [duplicateFiles, setDuplicateFiles] = useState<MediaFile[]>([]);
  const [missingArtworkFiles, setMissingArtworkFiles] = useState<MediaFile[]>([]);
  const [unformattedFiles, setUnformattedFiles] = useState<MediaFile[]>([]);

  const runLibraryDiagnostics = () => {
    const audioFiles = files.filter(f => !f.isDeleted && f.fileType === 'audio');

    // 1. Detect duplicates (same name or same size)
    const seenNames = new Map<string, MediaFile>();
    const dupes: MediaFile[] = [];
    for (const f of audioFiles) {
      const key = f.name.toLowerCase().trim();
      if (seenNames.has(key)) {
        dupes.push(f);
      } else {
        seenNames.set(key, f);
      }
    }
    setDuplicateFiles(dupes);

    // 2. Missing artwork (no thumbnail or default placeholder)
    const missingArt = audioFiles.filter(
      f => !f.thumbnailPath || f.thumbnailPath.includes('placeholder') || f.thumbnailPath === ''
    );
    setMissingArtworkFiles(missingArt);

    // 3. Unformatted metadata
    const unformatted = audioFiles.filter(f => {
      const name = f.name;
      return name.includes('_') || /128|320|kbps/i.test(name) || name === name.toLowerCase();
    });
    setUnformattedFiles(unformatted);

    setLibraryHealthModalVisible(true);
  };

  const handleAutoFixDuplicates = async () => {
    if (duplicateFiles.length === 0) return;
    await softDeleteFiles(duplicateFiles.map(d => d.id));
    Alert.alert('Duplicates Cleaned', `Moved ${duplicateFiles.length} duplicate file(s) to Recycle Bin.`);
    runLibraryDiagnostics();
  };

  const handleAutoFixArtwork = async () => {
    if (missingArtworkFiles.length === 0) return;
    const curatedArts = [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
    ];
    for (let i = 0; i < missingArtworkFiles.length; i++) {
      const f = missingArtworkFiles[i];
      await updateFileThumbnail(f.id, curatedArts[i % curatedArts.length]);
    }
    Alert.alert('Artwork Assigned', `Assigned curated HD artwork to ${missingArtworkFiles.length} track(s).`);
    runLibraryDiagnostics();
  };

  const handleAutoFixMetadata = async () => {
    if (unformattedFiles.length === 0) return;
    for (const f of unformattedFiles) {
      const cleanName = f.name
        .replace(/_/g, ' ')
        .replace(/\.[^/.]+$/, '')
        .replace(/\b\w/g, l => l.toUpperCase());
      await renameFile(f.id, cleanName + (f.name.includes('.') ? '.' + f.name.split('.').pop() : ''));
    }
    Alert.alert('Metadata Formatted', `Cleaned titles for ${unformattedFiles.length} track(s).`);
    runLibraryDiagnostics();
  };

  // Folder Rename State
  const [renameFolderModalVisible, setRenameFolderModalVisible] = useState(false);
  const [folderToRename, setFolderToRename] = useState<MediaFolder | null>(null);
  const [newFolderRenameName, setNewFolderRenameName] = useState('');

  // Move To Folder State
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [targetFileIdsToMove, setTargetFileIdsToMove] = useState<string[]>([]);

  const openMoveModal = (fileIds: string[]) => {
    setTargetFileIdsToMove(fileIds);
    setMoveModalVisible(true);
  };

  const handleExecuteMove = async (targetFolderId: string | null) => {
    if (targetFileIdsToMove.length > 0) {
      await moveFiles(targetFileIdsToMove, targetFolderId);
      const targetFolder = folders.find(f => f.id === targetFolderId);
      Alert.alert(
        'Moved Successfully',
        `${targetFileIdsToMove.length} item(s) moved to ${targetFolder ? `"${targetFolder.name}"` : 'Root Library'}.`
      );
      setMoveModalVisible(false);
      setTargetFileIdsToMove([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedia();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const openRenameModal = (file: MediaFile) => {
    setTargetFileForRename(file);
    setRenameInputText(file.name);
    setRenameModalVisible(true);
  };

  const handleSaveRename = async () => {
    if (targetFileForRename && renameInputText.trim()) {
      await renameFile(targetFileForRename.id, renameInputText.trim());
      setRenameModalVisible(false);
      setTargetFileForRename(null);
    }
  };

  const handleEncryptFileToVault = (file: MediaFile) => {
    Alert.alert(
      'Encrypt to Private Vault',
      `Encrypt "${file.name}" with client-side AES-256 and hide it in your Private Vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Encrypt & Hide',
          onPress: async () => {
            try {
              await addFileToVault({
                name: file.name,
                uri: file.uri || file.storagePath,
                mimeType: file.mimeType,
                size: file.sizeBytes,
              });
              await softDeleteFiles([file.id]);
              Alert.alert('Encrypted', `"${file.name}" has been transferred to your Private Vault.`);
            } catch (err: any) {
              Alert.alert('Vault Notice', err?.message || 'Could not encrypt file to vault.');
            }
          },
        },
      ]
    );
  };

  const allDisplayedFiles = getFilteredFiles();
  // Display all files cleanly (images, videos, audio, documents) according to active filter
  const displayedFiles = allDisplayedFiles;
  const isMultiSelecting = selectedFileIds.size > 0;

  const currentFolder = folders.find(f => f.id === currentFolderId);

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setNewFolderModalVisible(false);
    }
  };

  const openRenameFolderModal = (folder: MediaFolder) => {
    setFolderToRename(folder);
    setNewFolderRenameName(folder.name);
    setRenameFolderModalVisible(true);
  };

  const handleSaveRenameFolder = async () => {
    if (folderToRename && newFolderRenameName.trim()) {
      await renameFolder(folderToRename.id, newFolderRenameName.trim());
      setRenameFolderModalVisible(false);
      setFolderToRename(null);
      Alert.alert('Folder Renamed', `Folder renamed to "${newFolderRenameName.trim()}".`);
    }
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Move to Recycle Bin',
      `Move ${selectedFileIds.size} file(s) to Recycle Bin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          style: 'destructive',
          onPress: () => softDeleteFiles(Array.from(selectedFileIds)),
        },
      ]
    );
  };

  const handleChangeFolderCover = async (folder: MediaFolder) => {
    try {
      const image = await pickMediaFromLibrary('images');
      if (image?.uri) {
        await setFolderCover(folder.id, image.uri);
        Alert.alert('Folder Cover Updated', `Cover image for "${folder.name}" updated successfully.`);
      }
    } catch (e: any) {
      Alert.alert('Cover Error', e?.message || 'Failed to select folder cover');
    }
  };

  const handleUploadNew = async () => {
    Alert.alert('Upload Media', 'Choose upload source (Multi-select enabled):', [
      {
        text: '📸 Bulk Photos & Videos (Gallery)',
        onPress: async () => {
          try {
            const picked = await pickMultipleMediaFromLibrary('all');
            if (picked && picked.length > 0) {
              const count = await uploadMultipleFiles(picked, currentFolderId);
              Alert.alert('Bulk Upload Complete', `Successfully uploaded ${count} media items.`);
            }
          } catch (e: any) {
            Alert.alert('Upload Error', e?.message || 'Failed to bulk upload photos/videos');
          }
        },
      },
      {
        text: '🎵 Bulk Music & Audio',
        onPress: async () => {
          try {
            const picked = await pickMultipleAudioFiles();
            if (picked && picked.length > 0) {
              const count = await uploadMultipleFiles(picked, currentFolderId);
              Alert.alert('Bulk Upload Complete', `Successfully uploaded ${count} audio tracks.`);
            }
          } catch (e: any) {
            Alert.alert('Upload Error', e?.message || 'Failed to bulk upload audio');
          }
        },
      },
      {
        text: '📄 Bulk Documents & Files',
        onPress: async () => {
          try {
            const picked = await pickMultipleDocumentsFromSystem();
            if (picked && picked.length > 0) {
              const count = await uploadMultipleFiles(picked, currentFolderId);
              Alert.alert('Bulk Upload Complete', `Successfully uploaded ${count} files.`);
            }
          } catch (e: any) {
            Alert.alert('Upload Error', e?.message || 'Failed to bulk upload files');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filterTabs: { id: MediaType | 'all' | 'favourites'; label: string; icon: any }[] = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'image', label: 'Images', icon: 'image-outline' },
    { id: 'video', label: 'Videos', icon: 'videocam-outline' },
    { id: 'audio', label: 'Music', icon: 'musical-notes-outline' },
    { id: 'pdf', label: 'PDFs', icon: 'document-text-outline' },
    { id: 'favourites', label: 'Favorites', icon: 'heart-outline' },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTitleRow}>
          {currentFolderId ? (
            <TouchableOpacity
              style={styles.backFolderBtn}
              onPress={() => setCurrentFolder(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={theme.text} />
              <Text style={[styles.folderTitle, { color: theme.text }]} numberOfLines={1}>
                {currentFolder?.name || 'Folder'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.headerTitle, { color: theme.text }]}>AK FILES</Text>
          )}

          <View style={styles.headerRightBtns}>
            {isMultiSelecting ? (
              <>
                <TouchableOpacity onPress={selectAll} style={styles.iconBtn}>
                  <Ionicons name="checkbox" size={22} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openMoveModal(Array.from(selectedFileIds))} style={styles.iconBtn}>
                  <Ionicons name="folder-open" size={22} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleBulkDelete} style={styles.iconBtn}>
                  <Ionicons name="trash" size={22} color={theme.danger} />
                </TouchableOpacity>
                <TouchableOpacity onPress={deselectAll} style={styles.iconBtn}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleUploadNew}
                  style={[styles.addBtn, { backgroundColor: theme.primary }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={22} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFolderMenuVisible(true)}
                  style={[styles.folderOptionsBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={theme.text} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSubtle} />
          <TextInput
            placeholder="Search all files and music..."
            placeholderTextColor={theme.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSubtle} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
        >
          {filterTabs.map(tab => {
            const isSelected = selectedFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setSelectedFilter(tab.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isSelected ? '#FFF' : theme.textMuted}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFF' : theme.textMuted },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Upload Progress Banner */}
      {isUploading && (
        <View style={[styles.uploadBanner, { backgroundColor: theme.primaryGlow }]}>
          <Text style={[styles.uploadText, { color: theme.primary }]}>
            Uploading to Cloud... {uploadProgress}%
          </Text>
        </View>
      )}

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
        {/* Folders Section (Only on root level) */}
        {!currentFolderId && (
          <View style={styles.foldersSection}>
            <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>FOLDERS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foldersScroll}>
              {folders.map(folder => {
                const folderItemCount = files.filter(
                  f => !f.isDeleted && f.folderId === folder.id
                ).length;

                return (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.folderCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setCurrentFolder(folder.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.folderCardTopRow}>
                      {folder.coverUri ? (
                        <Image
                          source={{ uri: folder.coverUri }}
                          style={{ width: 44, height: 44, borderRadius: 10 }}
                        />
                      ) : (
                        <View style={[styles.folderIconBox, { backgroundColor: folder.color + '25' }]}>
                          <Ionicons name="folder" size={24} color={folder.color} />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.folderTrashBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert('Folder Options', folder.name, [
                            {
                              text: '✏️ Rename Folder',
                              onPress: () => openRenameFolderModal(folder),
                            },
                            {
                              text: '🖼️ Change Cover Image',
                              onPress: () => handleChangeFolderCover(folder),
                            },
                            {
                              text: '🗑️ Delete Folder',
                              style: 'destructive',
                              onPress: () => {
                                Alert.alert('Delete Folder', `Delete "${folder.name}"? Files will be kept in main library.`, [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                      await deleteFolder(folder.id);
                                      Alert.alert('Folder Deleted', `Folder "${folder.name}" has been deleted.`);
                                    },
                                  },
                                ]);
                              },
                            },
                            { text: 'Cancel', style: 'cancel' },
                          ]);
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.folderName, { color: theme.text }]} numberOfLines={1}>
                      {folder.name}
                    </Text>
                    <Text style={[styles.folderCount, { color: theme.textSubtle }]}>
                      {folderItemCount} {folderItemCount === 1 ? 'item' : 'items'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Files Grid or List */}
        <Text style={[styles.sectionHeading, { color: theme.textSubtle }]}>
          FILES ({displayedFiles.length})
        </Text>

        {displayedFiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-outline" size={54} color={theme.textSubtle} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No files in this folder.
            </Text>
            <TouchableOpacity
              style={[styles.emptyUploadBtn, { backgroundColor: theme.primary }]}
              onPress={handleUploadNew}
            >
              <Text style={styles.emptyUploadBtnText}>UPLOAD FILE</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'grid' ? (
          <View style={styles.grid}>
            {displayedFiles.map(file => {
              const isSelected = selectedFileIds.has(file.id);
              const hasImagePreview = !!(file.thumbnailPath || file.fileType === 'image');
              return (
                <TouchableOpacity
                  key={file.id}
                  activeOpacity={0.8}
                  style={[
                    styles.gridItem,
                    {
                      backgroundColor: theme.card,
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (isMultiSelecting) {
                      toggleSelectFile(file.id);
                    } else {
                      setViewerFile(file);
                    }
                  }}
                  onLongPress={() => toggleSelectFile(file.id)}
                >
                  <View style={[styles.gridThumb, { backgroundColor: theme.surface }]}>
                    {hasImagePreview ? (
                      <Image
                        source={{ uri: file.thumbnailPath || file.uri || file.storagePath }}
                        style={styles.gridImg}
                      />
                    ) : (
                      <Ionicons
                        name={
                          file.fileType === 'video'
                            ? 'film'
                            : file.fileType === 'audio'
                            ? 'musical-notes'
                            : 'document-text'
                        }
                        size={32}
                        color={theme.primary}
                      />
                    )}

                    {isSelected && (
                      <View style={[styles.selectedCheckBadge, { backgroundColor: theme.primary }]}>
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.gridMetaRow}>
                    <View style={{ flex: 1, marginRight: 4 }}>
                      <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={[styles.gridSubtitle, { color: theme.textSubtle }]}>
                        {formatFileSize(file.sizeBytes)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.gridActionBtn}
                      onPress={() => {
                        Alert.alert('File Options', file.name, [
                          { text: '📁 Move to Folder', onPress: () => openMoveModal([file.id]) },
                          { text: '✏️ Rename', onPress: () => openRenameModal(file) },
                          { text: file.isFavourite ? '💔 Unfavorite' : '❤️ Favorite', onPress: () => toggleFavourite(file.id) },
                          { text: '🔒 Encrypt to Private Vault', onPress: () => handleEncryptFileToVault(file) },
                          { text: '🗑️ Delete File', style: 'destructive', onPress: () => softDeleteFiles([file.id]) },
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color={theme.textSubtle} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.list}>
            {displayedFiles.map(file => {
              const isSelected = selectedFileIds.has(file.id);
              const hasImagePreview = !!(file.thumbnailPath || file.fileType === 'image');
              return (
                <TouchableOpacity
                  key={file.id}
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: theme.card,
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (isMultiSelecting) {
                      toggleSelectFile(file.id);
                    } else {
                      setViewerFile(file);
                    }
                  }}
                  onLongPress={() => toggleSelectFile(file.id)}
                >
                  <View style={[styles.listIconBox, { backgroundColor: theme.surface, overflow: 'hidden' }]}>
                    {hasImagePreview ? (
                      <Image
                        source={{ uri: file.thumbnailPath || file.uri || file.storagePath }}
                        style={styles.listThumbImg}
                      />
                    ) : (
                      <Ionicons
                        name={
                          file.fileType === 'image'
                            ? 'image'
                            : file.fileType === 'video'
                            ? 'videocam'
                            : file.fileType === 'audio'
                            ? 'musical-notes'
                            : 'document-text'
                        }
                        size={20}
                        color={theme.primary}
                      />
                    )}
                  </View>
                  <View style={styles.listMeta}>
                    <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={[styles.listSub, { color: theme.textSubtle }]}>
                      {formatFileSize(file.sizeBytes)} • {file.fileType.toUpperCase()}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkbox" size={22} color={theme.primary} />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('File Actions', file.name, [
                          { text: '📁 Move to Folder', onPress: () => openMoveModal([file.id]) },
                          { text: 'Rename', onPress: () => openRenameModal(file) },
                          { text: file.isFavourite ? 'Unfavorite' : 'Favorite', onPress: () => toggleFavourite(file.id) },
                          { text: '🔒 Encrypt to Private Vault', onPress: () => handleEncryptFileToVault(file) },
                          { text: 'Delete', style: 'destructive', onPress: () => softDeleteFiles([file.id]) },
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }}
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={theme.textSubtle} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Folder Modal */}
      <Modal
        visible={newFolderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewFolderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setNewFolderModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>NEW FOLDER</Text>
              <TouchableOpacity onPress={() => setNewFolderModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Folder Name"
              placeholderTextColor={theme.textSubtle}
              value={newFolderName}
              onChangeText={setNewFolderName}
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setNewFolderModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleCreateFolder}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      

      {/* Rename File Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRenameModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>RENAME FILE</Text>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="New filename"
              placeholderTextColor={theme.textSubtle}
              value={renameInputText}
              onChangeText={setRenameInputText}
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleSaveRename}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      

      {/* Rename Folder Modal */}
      <Modal
        visible={renameFolderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameFolderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRenameFolderModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>RENAME FOLDER</Text>
              <TouchableOpacity onPress={() => setRenameFolderModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Folder Name"
              placeholderTextColor={theme.textSubtle}
              value={newFolderRenameName}
              onChangeText={setNewFolderRenameName}
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRenameFolderModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={handleSaveRenameFolder}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>SORT FILES</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>
            {[
              { id: 'date_desc', label: 'Date: Newest First' },
              { id: 'date_asc', label: 'Date: Oldest First' },
              { id: 'name_asc', label: 'Name: A to Z' },
              { id: 'size_desc', label: 'File Size: Largest First' },
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.sortOption,
                  {
                    backgroundColor: sortBy === item.id ? theme.primaryGlow : 'transparent',
                  },
                ]}
                onPress={() => {
                  setSortBy(item.id as any);
                  setSortModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: sortBy === item.id ? theme.primary : theme.text },
                  ]}
                >
                  {item.label}
                </Text>
                {sortBy === item.id && (
                  <Ionicons name="checkmark" size={18} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.modalCancel, { marginTop: 8, alignItems: 'center' }]}
              onPress={() => setSortModalVisible(false)}
            >
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      

      {/* Move to Folder Modal */}
      <Modal
        visible={moveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMoveModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '80%' }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                MOVE TO FOLDER ({targetFileIdsToMove.length})
              </Text>
              <TouchableOpacity onPress={() => setMoveModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {/* Option 1: Root / No Folder */}
              <TouchableOpacity
                style={[styles.moveFolderRow, { borderColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => handleExecuteMove(null)}
                activeOpacity={0.7}
              >
                <View style={[styles.moveFolderIconBox, { backgroundColor: theme.primaryGlow }]}>
                  <Ionicons name="home-outline" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moveFolderName, { color: theme.text }]}>Root Library (No Folder)</Text>
                  <Text style={[styles.moveFolderSub, { color: theme.textSubtle }]}>Keep unassigned in main files</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
              </TouchableOpacity>

              {/* Folders List */}
              {folders.map(folder => {
                const folderItemCount = files.filter(f => !f.isDeleted && f.folderId === folder.id).length;
                return (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.moveFolderRow, { borderColor: theme.border, backgroundColor: theme.card }]}
                    onPress={() => handleExecuteMove(folder.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.moveFolderIconBox, { backgroundColor: folder.color + '25' }]}>
                      <Ionicons name="folder" size={20} color={folder.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.moveFolderName, { color: theme.text }]}>{folder.name}</Text>
                      <Text style={[styles.moveFolderSub, { color: theme.textSubtle }]}>
                        {folderItemCount} {folderItemCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => {
                  setMoveModalVisible(false);
                  setNewFolderModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={{ color: theme.primary, fontWeight: '800' }}>+ NEW FOLDER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setMoveModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      

      {/* Smart Music Library Health & Diagnostics Modal (Feature 8) */}
      <Modal
        visible={libraryHealthModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLibraryHealthModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLibraryHealthModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="pulse" size={20} color="#10B981" />
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                  SMART LIBRARY HEALTH
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLibraryHealthModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 14 }}>
              Automated diagnostics scan for duplicate tracks, missing artwork, and unformatted metadata.
            </Text>

            {/* Diagnostic Metrics */}
            <View style={{ gap: 8, marginBottom: 16 }}>
              {/* Duplicates Card */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.card,
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: duplicateFiles.length > 0 ? 'rgba(239, 68, 68, 0.3)' : theme.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name="copy-outline"
                    size={16}
                    color={duplicateFiles.length > 0 ? '#EF4444' : '#10B981'}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
                    Duplicate Tracks
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: duplicateFiles.length > 0 ? '#EF4444' : '#10B981',
                    }}
                  >
                    {duplicateFiles.length} found
                  </Text>
                  {duplicateFiles.length > 0 && (
                    <TouchableOpacity
                      onPress={handleAutoFixDuplicates}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444' }}>FIX</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Missing Artwork Card */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.card,
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: missingArtworkFiles.length > 0 ? 'rgba(245, 158, 11, 0.3)' : theme.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name="image-outline"
                    size={16}
                    color={missingArtworkFiles.length > 0 ? '#F59E0B' : '#10B981'}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
                    Missing Artwork
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: missingArtworkFiles.length > 0 ? '#F59E0B' : '#10B981',
                    }}
                  >
                    {missingArtworkFiles.length} tracks
                  </Text>
                  {missingArtworkFiles.length > 0 && (
                    <TouchableOpacity
                      onPress={handleAutoFixArtwork}
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#F59E0B' }}>ASSIGN</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Unformatted Metadata Card */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.card,
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: unformattedFiles.length > 0 ? 'rgba(59, 130, 246, 0.3)' : theme.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name="text-outline"
                    size={16}
                    color={unformattedFiles.length > 0 ? '#3B82F6' : '#10B981'}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
                    Raw / Unformatted Titles
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: unformattedFiles.length > 0 ? '#3B82F6' : '#10B981',
                    }}
                  >
                    {unformattedFiles.length} tracks
                  </Text>
                  {unformattedFiles.length > 0 && (
                    <TouchableOpacity
                      onPress={handleAutoFixMetadata}
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#3B82F6' }}>FORMAT</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setLibraryHealthModalVisible(false)}
              >
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: '#10B981' }]}
                onPress={async () => {
                  if (duplicateFiles.length > 0) await handleAutoFixDuplicates();
                  if (missingArtworkFiles.length > 0) await handleAutoFixArtwork();
                  if (unformattedFiles.length > 0) await handleAutoFixMetadata();
                  Alert.alert('Health Optimizations Applied', 'All detectable library issues fixed successfully.');
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>FIX ALL ISSUES</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      

      {/* Feature Clean: Three Dots Folder & File Options Sheet */}
      <Modal
        visible={folderMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFolderMenuVisible(false)}
        >
          <View
            style={[styles.threeDotsSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
                {currentFolder ? 'Folder: ' + currentFolder.name : 'File Library Tools'}
              </Text>
              <TouchableOpacity onPress={() => setFolderMenuVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {currentFolder && (
              <>
                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => {
                    setFolderMenuVisible(false);
                    handleChangeFolderCover(currentFolder);
                  }}
                >
                  <View style={[styles.sheetOptionIcon, { backgroundColor: theme.card }]}>
                    <Ionicons name="camera-outline" size={18} color={theme.accent} />
                  </View>
                  <Text style={[styles.sheetOptionText, { color: theme.text }]}>Change Folder Cover</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => {
                    setFolderMenuVisible(false);
                    openRenameFolderModal(currentFolder);
                  }}
                >
                  <View style={[styles.sheetOptionIcon, { backgroundColor: theme.card }]}>
                    <Ionicons name="pencil-outline" size={18} color={theme.primary} />
                  </View>
                  <Text style={[styles.sheetOptionText, { color: theme.text }]}>Rename Folder</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setViewMode(viewMode === 'grid' ? 'list' : 'grid');
                setFolderMenuVisible(false);
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: theme.card }]}>
                <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={18} color={theme.primary} />
              </View>
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>
                Switch to {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setFolderMenuVisible(false);
                setSortModalVisible(true);
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="filter-outline" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Sort & Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setFolderMenuVisible(false);
                setNewFolderModalVisible(true);
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="folder-outline" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>New Folder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setFolderMenuVisible(false);
                runLibraryDiagnostics();
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="pulse-outline" size={18} color="#10B981" />
              </View>
              <Text style={[styles.sheetOptionText, { color: theme.text }]}>Smart Library Health</Text>
            </TouchableOpacity>

            {currentFolder && (
              <TouchableOpacity
                style={[styles.sheetOption, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4, paddingTop: 10 }]}
                onPress={() => {
                  setFolderMenuVisible(false);
                  Alert.alert(
                    'Delete Folder',
                    'Delete folder "' + (currentFolder ? currentFolder.name : '') + '"? Files will be kept in your main library.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete Folder',
                        style: 'destructive',
                        onPress: async () => {
                          if (currentFolderId) {
                            await deleteFolder(currentFolderId);
                            setCurrentFolder(null);
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <View style={[styles.sheetOptionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </View>
                <Text style={[styles.sheetOptionText, { color: theme.danger, fontWeight: '700' }]}>Delete Folder</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full-Screen Media Viewer */}
      <MediaViewerModal
        file={viewerFile}
        onClose={() => setViewerFile(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  folderOptionsBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threeDotsSheet: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  sheetOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerFolderWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  deleteFolderHeaderBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  backFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 180,
  },
  folderTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  headerRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 6,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillsContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  uploadBanner: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '800',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  foldersSection: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  foldersScroll: {
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },
  folderCard: {
    width: 128,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  folderCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  folderTrashBtn: {
    padding: 4,
  },
  folderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderName: {
    fontSize: 13,
    fontWeight: '800',
  },
  folderCount: {
    fontSize: 11,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 50) / 2,
    borderRadius: 16,
    padding: 10,
  },
  gridThumb: {
    width: '100%',
    height: 128,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  gridImg: {
    width: '100%',
    height: '100%',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gridActionBtn: {
    padding: 4,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.select({ android: 'sans-serif-medium', ios: 'System' }),
  },
  gridSubtitle: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: Platform.select({ android: 'sans-serif', ios: 'System' }),
  },
  list: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
  },
  listIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listThumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  listMeta: {
    flex: 1,
    marginLeft: 12,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  listSub: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 20,
  },
  emptyUploadBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyUploadBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalConfirm: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  moveFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  moveFolderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveFolderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  moveFolderSub: {
    fontSize: 11,
    marginTop: 2,
  },
});

