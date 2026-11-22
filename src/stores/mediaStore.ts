// ==============================================================================
// NEXORA MEDIA & FILE MANAGEMENT STORE (Zustand + Real-Time Sync)
// ==============================================================================

import { create } from 'zustand';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { MediaFile, MediaFolder, MediaType, StorageAnalytics, FileActivityLog, Track } from '../types';
import { supabase, isConfigured } from '../services/supabase';
import { StorageService } from '../services/storage';

const META_CACHE_FILE = `${FileSystem.documentDirectory || ''}nexora_files_meta.json`;

async function saveLocalCache(files: MediaFile[], folders: MediaFolder[]) {
  if (Platform.OS === 'web') return;
  try {
    const data = JSON.stringify({ files, folders });
    await FileSystem.writeAsStringAsync(META_CACHE_FILE, data);
  } catch (e) {}
}

async function loadLocalCache(): Promise<{ files: MediaFile[]; folders: MediaFolder[] } | null> {
  if (Platform.OS === 'web') return null;
  try {
    const info = await FileSystem.getInfoAsync(META_CACHE_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(META_CACHE_FILE);
      return JSON.parse(content);
    }
  } catch (e) {}
  return null;
}

interface MediaState {
  files: MediaFile[];
  folders: MediaFolder[];
  activityLogs: FileActivityLog[];
  currentFolderId: string | null;
  selectedFileIds: Set<string>;
  searchQuery: string;
  selectedFilter: MediaType | 'all' | 'favourites';
  sortBy: 'date_desc' | 'date_asc' | 'name_asc' | 'size_desc';
  viewMode: 'grid' | 'list';
  isUploading: boolean;
  uploadProgress: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMedia: () => Promise<void>;
  createFolder: (name: string, color?: string, icon?: string) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  setFolderCover: (folderId: string, coverUri: string) => Promise<void>;
  setCurrentFolder: (folderId: string | null) => void;

  uploadFile: (file: { uri: string; name: string; mimeType: string; size: number; duration?: number; width?: number; height?: number; thumbnailPath?: string }) => Promise<void>;
  uploadMultipleFiles: (files: { uri: string; name: string; mimeType: string; size: number; duration?: number; width?: number; height?: number; thumbnailPath?: string }[], folderIdOverride?: string | null) => Promise<number>;
  updateFileThumbnail: (fileId: string, thumbnailPath: string) => Promise<void>;
  renameFile: (fileId: string, newName: string, newArtist?: string) => Promise<void>;

  // Cover image resizing utility
  createOptimizedThumbnail: (imageUrl: string, width?: number, height?: number) => Promise<string>;
  moveFile: (fileId: string, targetFolderId: string | null) => Promise<void>;
  moveFiles: (fileIds: string[], targetFolderId: string | null) => Promise<void>;
  toggleFavourite: (fileId: string) => Promise<void>;

  // Recycle Bin & History
  softDeleteFiles: (fileIds: string[]) => Promise<void>;
  restoreFiles: (fileIds: string[]) => Promise<void>;
  permanentlyDeleteFiles: (fileIds: string[]) => Promise<void>;
  emptyRecycleBin: () => Promise<void>;
  clearAllDemoData: () => void;

  // Selection & UI Filters
  toggleSelectFile: (fileId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedFilter: (filter: MediaType | 'all' | 'favourites') => void;
  setSortBy: (sortBy: 'date_desc' | 'date_asc' | 'name_asc' | 'size_desc') => void;
  setViewMode: (mode: 'grid' | 'list') => void;

  // Computed Helpers
  getFilteredFiles: () => MediaFile[];
  getRecycleBinFiles: () => MediaFile[];
  getStorageAnalytics: () => StorageAnalytics;

  // Downloads functionality
  getDownloadedTracks: () => Track[];
  isDownloaded: (trackId: string) => boolean;
  markAsDownloaded: (trackId: string) => void;
}

const INITIAL_DEMO_FILES: MediaFile[] = [];

// Canonical default category folders — IDs are fixed constants
const DEFAULT_FOLDER_1: MediaFolder = {
  id: 'folder-1',
  userId: 'current',
  name: 'Images & Photos',
  color: '#6366F1',
  icon: 'image',
  fileCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};
const DEFAULT_FOLDER_2: MediaFolder = {
  id: 'folder-2',
  userId: 'current',
  name: 'Music & Audio',
  color: '#EC4899',
  icon: 'musical-notes',
  fileCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};
const DEFAULT_FOLDER_3: MediaFolder = {
  id: 'folder-3',
  userId: 'current',
  name: 'Documents & PDFs',
  color: '#06B6D4',
  icon: 'document-text',
  fileCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const INITIAL_DEMO_FOLDERS: MediaFolder[] = [
  DEFAULT_FOLDER_1,
  DEFAULT_FOLDER_2,
  DEFAULT_FOLDER_3,
];

/** Ensure canonical default folders are always present in the folders list */
function mergeWithDefaultFolders(folders: MediaFolder[]): MediaFolder[] {
  const defaults = [DEFAULT_FOLDER_1, DEFAULT_FOLDER_2, DEFAULT_FOLDER_3];
  const merged = [...folders];
  for (const def of defaults) {
    if (!merged.find(f => f.id === def.id)) {
      merged.unshift(def);
    }
  }
  return merged;
}

/** Recompute fileCount for each folder based on current files list */
function recomputeFolderCounts(folders: MediaFolder[], files: MediaFile[]): MediaFolder[] {
  return folders.map(folder => ({
    ...folder,
    fileCount: files.filter(f => !f.isDeleted && f.folderId === folder.id).length,
  }));
}

export const useMediaStore = create<MediaState>((set, get) => ({
  files: INITIAL_DEMO_FILES,
  folders: INITIAL_DEMO_FOLDERS,
  activityLogs: [],
  currentFolderId: null,
  selectedFileIds: new Set<string>(),
  searchQuery: '',
  selectedFilter: 'all',
  sortBy: 'date_desc',
  viewMode: 'grid',
  isUploading: false,
  uploadProgress: 0,
  isLoading: false,
  error: null,

  fetchMedia: async () => {
    try {
      // 1. Restore local cache first, filtering out old hardcoded demo files
      const local = await loadLocalCache();
      if (local && local.files) {
        const cleanedFiles = local.files
          .filter(f => f.userId !== 'demo-user-12345')
          .map(f => {
            if (!f.folderId) {
              if (f.fileType === 'audio') return { ...f, folderId: 'folder-2' };
              if (f.fileType === 'image') return { ...f, folderId: 'folder-1' };
              if (f.fileType === 'pdf' || f.fileType === 'document') return { ...f, folderId: 'folder-3' };
            }
            return f;
          });

        const rawFolders = local.folders && local.folders.length > 0 ? local.folders : INITIAL_DEMO_FOLDERS;
        const mergedFolders = mergeWithDefaultFolders(rawFolders);
        const cleanedFolders = recomputeFolderCounts(mergedFolders, cleanedFiles);
        set({ files: cleanedFiles, folders: cleanedFolders });
      }

      if (!isConfigured) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Only replace when authenticated user session exists

      const { data: foldersData } = await supabase
        .from('folders')
        .select('*')
        .order('name');

      const { data: filesData } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: logsData } = await supabase
        .from('file_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (foldersData) {
        set({
          folders: foldersData.map(f => ({
            id: f.id,
            userId: f.user_id,
            parentId: f.parent_id,
            name: f.name,
            color: f.color,
            icon: f.icon,
            createdAt: f.created_at,
            updatedAt: f.updated_at,
          })),
        });
      }

      if (filesData && filesData.length > 0) {
        set({
          files: filesData.map(f => ({
            id: f.id,
            userId: f.user_id,
            folderId: f.folder_id,
            name: f.name,
            originalName: f.original_name,
            storagePath: f.storage_path,
            mimeType: f.mime_type,
            fileType: f.file_type,
            sizeBytes: f.size_bytes,
            thumbnailPath: f.thumbnail_path,
            durationSeconds: f.duration_seconds,
            width: f.width,
            height: f.height,
            artist: f.artist,
            album: f.album,
            title: f.title,
            isFavourite: f.is_favourite,
            isDeleted: f.is_deleted,
            deletedAt: f.deleted_at,
            createdAt: f.created_at,
            updatedAt: f.updated_at,
            uri: f.storage_path,
          })),
        });
      }

      if (logsData) {
        set({
          activityLogs: logsData.map(l => ({
            id: l.id,
            userId: l.user_id,
            mediaFileId: l.media_file_id,
            action: l.action,
            details: l.details,
            createdAt: l.created_at,
          })),
        });
      }
    } catch (err: any) {
      console.log('[NEXORA Media] Fetch note:', err?.message);
    }
  },

  createFolder: async (name: string, color = '#6366F1', icon = 'folder') => {
    const newFolder: MediaFolder = {
      id: 'folder-' + Date.now(),
      userId: 'current',
      parentId: get().currentFolderId,
      name,
      color,
      icon,
      fileCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set(state => ({ folders: [...state.folders, newFolder] }));
    saveLocalCache(get().files, get().folders);

    if (isConfigured) {
      try {
        await supabase.from('folders').insert({
          id: newFolder.id,
          name,
          color,
          icon,
          parent_id: get().currentFolderId,
        });
      } catch {}
    }
  },

  renameFolder: async (folderId: string, newName: string) => {
    set(state => ({
      folders: state.folders.map(f => (f.id === folderId ? { ...f, name: newName } : f)),
    }));
    saveLocalCache(get().files, get().folders);
    if (isConfigured) {
      try {
        await supabase.from('folders').update({ name: newName }).eq('id', folderId);
      } catch {}
    }
  },

  deleteFolder: async (folderId: string) => {
    set(state => ({
      folders: state.folders.filter(f => f.id !== folderId),
      files: state.files.map(f => (f.folderId === folderId ? { ...f, folderId: null } : f)),
      currentFolderId: state.currentFolderId === folderId ? null : state.currentFolderId,
    }));
    saveLocalCache(get().files, get().folders);
    if (isConfigured) {
      try {
        await supabase.from('folders').delete().eq('id', folderId);
      } catch {}
    }
  },

  setFolderCover: async (folderId: string, coverUri: string) => {
    let persistedCover = coverUri;
    try {
      persistedCover = await StorageService.persistLocalFile(coverUri, `folder_cover_${folderId}`);
    } catch {}
    set(state => ({
      folders: state.folders.map(f => (f.id === folderId ? { ...f, coverUri: persistedCover } : f)),
    }));
    saveLocalCache(get().files, get().folders);
    if (isConfigured) {
      try {
        await supabase.from('folders').update({ cover_uri: persistedCover }).eq('id', folderId);
      } catch {}
    }
  },

  setCurrentFolder: (folderId: string | null) => {
    set({ currentFolderId: folderId, selectedFileIds: new Set<string>() });
  },

  uploadFile: async (file) => {
    try {
      set({ isUploading: true, uploadProgress: 15 });
      let fileType: MediaType = 'document';
      if (file.mimeType.startsWith('image/')) fileType = 'image';
      else if (file.mimeType.startsWith('video/')) fileType = 'video';
      else if (file.mimeType.startsWith('audio/')) fileType = 'audio';
      else if (file.mimeType.includes('pdf')) fileType = 'pdf';

      const fileId = 'file-' + Date.now();
      const storagePath = `${fileId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      set({ uploadProgress: 50 });
      const { storagePath: uploadedPath } = await StorageService.uploadFile({
        bucket: 'media-files',
        path: storagePath,
        uri: file.uri,
        mimeType: file.mimeType,
      });

      set({ uploadProgress: 90 });

      // Automatically place into appropriate category folder if none selected and exists
      let targetFolderId = get().currentFolderId;
      if (!targetFolderId) {
        const availableIds = new Set(get().folders.map(f => f.id));
        if (fileType === 'audio' && availableIds.has('folder-2')) targetFolderId = 'folder-2';
        else if (fileType === 'image' && availableIds.has('folder-1')) targetFolderId = 'folder-1';
        else if ((fileType === 'pdf' || fileType === 'document') && availableIds.has('folder-3')) targetFolderId = 'folder-3';
      }

      // Ensure thumbnailPath is permanently copied to app storage so gallery deletion never breaks it
      let persistedThumb = file.thumbnailPath;
      if (persistedThumb) {
        try {
          persistedThumb = await StorageService.persistLocalFile(persistedThumb, `thumb_${fileId}`);
        } catch (e) {}
      }

      const newMediaFile: MediaFile = {
        id: fileId,
        userId: 'current',
        folderId: targetFolderId,
        name: file.name,
        originalName: file.name,
        storagePath: uploadedPath,
        thumbnailPath: persistedThumb || undefined,
        mimeType: file.mimeType,
        fileType,
        sizeBytes: file.size || 1024000,
        durationSeconds: file.duration || null,
        width: file.width || null,
        height: file.height || null,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: fileType === 'audio' ? 'Uploaded Track' : undefined,
        isFavourite: false,
        isDeleted: false,
        uri: uploadedPath || file.uri,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set(state => {
        const updatedFiles = [newMediaFile, ...state.files];
        const updatedFolders = recomputeFolderCounts(state.folders, updatedFiles);
        return {
          files: updatedFiles,
          folders: updatedFolders,
          isUploading: false,
          uploadProgress: 100,
        };
      });

      saveLocalCache(get().files, get().folders);

      // Background sync to Supabase if authenticated
      if (isConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('media_files').insert({
              id: fileId,
              user_id: user.id,
              folder_id: get().currentFolderId,
              name: file.name,
              original_name: file.name,
              storage_path: uploadedPath,
              mime_type: file.mimeType,
              file_type: fileType,
              size_bytes: file.size || 1024000,
              duration_seconds: file.duration,
              width: file.width,
              height: file.height,
              title: file.name.replace(/\.[^/.]+$/, ''),
            });

            await supabase.from('file_activity_logs').insert({
              user_id: user.id,
              media_file_id: fileId,
              action: 'upload',
              details: { name: file.name, size: file.size },
            });
          }
        } catch (e) {
          console.log('[NEXORA Media] Supabase row insert notice:', e);
        }
      }
    } catch (err: any) {
      set({ isUploading: false, error: err.message });
      throw err;
    }
  },

  uploadMultipleFiles: async (fileList, folderIdOverride) => {
    if (!fileList || fileList.length === 0) return 0;
    try {
      set({ isUploading: true, uploadProgress: 5 });
      const newMediaFiles: MediaFile[] = [];
      const total = fileList.length;

      for (let i = 0; i < total; i++) {
        const file = fileList[i];
        let fileType: MediaType = 'document';
        if (file.mimeType.startsWith('image/')) fileType = 'image';
        else if (file.mimeType.startsWith('video/')) fileType = 'video';
        else if (file.mimeType.startsWith('audio/')) fileType = 'audio';
        else if (file.mimeType.includes('pdf')) fileType = 'pdf';

        const fileId = 'file-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const storagePath = `${fileId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const { storagePath: uploadedPath } = await StorageService.uploadFile({
          bucket: 'media-files',
          path: storagePath,
          uri: file.uri,
          mimeType: file.mimeType,
        });

        let targetFolderId = folderIdOverride !== undefined ? folderIdOverride : get().currentFolderId;
        if (!targetFolderId) {
          const availableIds = new Set(get().folders.map(f => f.id));
          if (fileType === 'audio' && availableIds.has('folder-2')) targetFolderId = 'folder-2';
          else if (fileType === 'image' && availableIds.has('folder-1')) targetFolderId = 'folder-1';
          else if ((fileType === 'pdf' || fileType === 'document') && availableIds.has('folder-3')) targetFolderId = 'folder-3';
        }

        let persistedThumb = file.thumbnailPath;
        if (persistedThumb) {
          try {
            persistedThumb = await StorageService.persistLocalFile(persistedThumb, `thumb_${fileId}`);
          } catch {}
        } else if (fileType === 'image') {
          persistedThumb = uploadedPath || file.uri;
        }

        const newMediaFile: MediaFile = {
          id: fileId,
          userId: 'current',
          folderId: targetFolderId,
          name: file.name,
          originalName: file.name,
          storagePath: uploadedPath || file.uri,
          thumbnailPath: persistedThumb || undefined,
          mimeType: file.mimeType,
          fileType,
          sizeBytes: file.size || 1024000,
          durationSeconds: file.duration || null,
          width: file.width || null,
          height: file.height || null,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: fileType === 'audio' ? 'Uploaded Track' : undefined,
          isFavourite: false,
          isDeleted: false,
          uri: uploadedPath || file.uri,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newMediaFiles.push(newMediaFile);
        set({ uploadProgress: Math.min(95, Math.round(((i + 1) / total) * 100)) });
      }

      set(state => {
        const updatedFiles = [...newMediaFiles, ...state.files];
        const updatedFolders = recomputeFolderCounts(state.folders, updatedFiles);
        return {
          files: updatedFiles,
          folders: updatedFolders,
          isUploading: false,
          uploadProgress: 100,
        };
      });

      saveLocalCache(get().files, get().folders);
      return newMediaFiles.length;
    } catch (err: any) {
      console.log('[NEXORA Media] Bulk upload note:', err?.message);
      set({ isUploading: false, uploadProgress: 0 });
      return 0;
    }
  },

  renameFile: async (fileId: string, newName: string, newArtist?: string) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === fileId
          ? {
              ...f,
              name: newName,
              title: newName,
              artist: newArtist !== undefined ? newArtist : f.artist,
              updatedAt: new Date().toISOString(),
            }
          : f
      ),
    }));
    saveLocalCache(get().files, get().folders);
    if (isConfigured) {
      try {
        await supabase
          .from('media_files')
          .update({ name: newName, title: newName, ...(newArtist ? { artist: newArtist } : {}) })
          .eq('id', fileId);
      } catch {}
    }
  },

  moveFile: async (fileId: string, targetFolderId: string | null) => {
    set(state => {
      const updatedFiles = state.files.map(f => (f.id === fileId ? { ...f, folderId: targetFolderId } : f));
      const updatedFolders = recomputeFolderCounts(state.folders, updatedFiles);
      return {
        files: updatedFiles,
        folders: updatedFolders,
      };
    });
    saveLocalCache(get().files, get().folders);
    if (isConfigured) {
      try {
        await supabase.from('media_files').update({ folder_id: targetFolderId }).eq('id', fileId);
      } catch {}
    }
  },

  moveFiles: async (fileIds: string[], targetFolderId: string | null) => {
    set(state => {
      const updatedFiles = state.files.map(f => (fileIds.includes(f.id) ? { ...f, folderId: targetFolderId } : f));
      const updatedFolders = recomputeFolderCounts(state.folders, updatedFiles);
      return {
        files: updatedFiles,
        folders: updatedFolders,
        selectedFileIds: new Set<string>(),
      };
    });
    saveLocalCache(get().files, get().folders);
    if (isConfigured) {
      try {
        await supabase.from('media_files').update({ folder_id: targetFolderId }).in('id', fileIds);
      } catch {}
    }
  },

  toggleFavourite: async (fileId: string) => {
    const file = get().files.find(f => f.id === fileId);
    if (!file) return;

    const newFav = !file.isFavourite;
    set(state => ({
      files: state.files.map(f => (f.id === fileId ? { ...f, isFavourite: newFav } : f)),
    }));
    saveLocalCache(get().files, get().folders);

    if (isConfigured) {
      try {
        await supabase.from('media_files').update({ is_favourite: newFav }).eq('id', fileId);
      } catch {}
    }
  },

  updateFileThumbnail: async (fileId: string, thumbnailPath: string) => {
    let persistentPath = thumbnailPath;
    try {
      persistentPath = await StorageService.persistLocalFile(thumbnailPath, `thumb_${fileId}`);
    } catch {}

    set(state => ({
      files: state.files.map(f =>
        f.id === fileId || f.uri === fileId || f.storagePath === fileId
          ? { ...f, thumbnailPath: persistentPath }
          : f
      ),
    }));
    saveLocalCache(get().files, get().folders);
    if (isConfigured) {
      try {
        await supabase
          .from('media_files')
          .update({ thumbnail_path: persistentPath })
          .or(`id.eq.${fileId},storage_path.eq.${fileId}`);
      } catch {}
    }
  },

  softDeleteFiles: async (fileIds: string[]) => {
    const now = new Date().toISOString();
    set(state => {
      const updatedFiles = state.files.map(f =>
        fileIds.includes(f.id) ? { ...f, isDeleted: true, deletedAt: now } : f
      );
      return {
        files: updatedFiles,
        folders: recomputeFolderCounts(state.folders, updatedFiles),
        selectedFileIds: new Set<string>(),
      };
    });
    saveLocalCache(get().files, get().folders);

    if (isConfigured) {
      try {
        await supabase
          .from('media_files')
          .update({ is_deleted: true, deleted_at: now })
          .in('id', fileIds);
      } catch {}
    }
  },

  restoreFiles: async (fileIds: string[]) => {
    set(state => ({
      files: state.files.map(f =>
        fileIds.includes(f.id) ? { ...f, isDeleted: false, deletedAt: null } : f
      ),
      selectedFileIds: new Set<string>(),
    }));
    saveLocalCache(get().files, get().folders);

    if (isConfigured) {
      try {
        await supabase
          .from('media_files')
          .update({ is_deleted: false, deleted_at: null })
          .in('id', fileIds);
      } catch {}
    }
  },

  permanentlyDeleteFiles: async (fileIds: string[]) => {
    const toDelete = get().files.filter(f => fileIds.includes(f.id));
    set(state => {
      const updatedFiles = state.files.filter(f => !fileIds.includes(f.id));
      return {
        files: updatedFiles,
        folders: recomputeFolderCounts(state.folders, updatedFiles),
        selectedFileIds: new Set<string>(),
      };
    });
    saveLocalCache(get().files, get().folders);

    if (isConfigured) {
      try {
        for (const f of toDelete) {
          await StorageService.deleteFile('media-files', f.storagePath);
        }
        await supabase.from('media_files').delete().in('id', fileIds);
      } catch {}
    }
  },

  emptyRecycleBin: async () => {
    const deletedFileIds = get().files.filter(f => f.isDeleted).map(f => f.id);
    await get().permanentlyDeleteFiles(deletedFileIds);
  },

  clearAllDemoData: () => {
    set({
      files: [],
      folders: [],
      selectedFileIds: new Set<string>(),
    });
  },

  toggleSelectFile: (fileId: string) => {
    set(state => {
      const next = new Set(state.selectedFileIds);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return { selectedFileIds: next };
    });
  },

  selectAll: () => {
    const currentFiles = get().getFilteredFiles();
    set({ selectedFileIds: new Set(currentFiles.map(f => f.id)) });
  },

  deselectAll: () => {
    set({ selectedFileIds: new Set<string>() });
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedFilter: (filter) => set({ selectedFilter: filter }),
  setSortBy: (sortBy) => set({ sortBy }),
  setViewMode: (viewMode) => set({ viewMode }),

  getFilteredFiles: () => {
    const { files, currentFolderId, searchQuery, selectedFilter, sortBy } = get();
    let result = files.filter(f => !f.isDeleted);

    if (currentFolderId !== null) {
      result = result.filter(f => f.folderId === currentFolderId);
    }

    if (selectedFilter === 'favourites') {
      result = result.filter(f => f.isFavourite);
    } else if (selectedFilter !== 'all') {
      result = result.filter(f => f.fileType === selectedFilter);
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        f =>
          f.name.toLowerCase().includes(q) ||
          f.title?.toLowerCase().includes(q) ||
          f.artist?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'size_desc') return b.sizeBytes - a.sizeBytes;
      return 0;
    });

    return result;
  },

  getRecycleBinFiles: () => {
    return get().files.filter(f => f.isDeleted);
  },

  getStorageAnalytics: () => {
    const files = get().files.filter(f => !f.isDeleted);
    let totalBytes = 0;
    const byType = {
      images: { count: 0, bytes: 0 },
      videos: { count: 0, bytes: 0 },
      audio: { count: 0, bytes: 0 },
      documents: { count: 0, bytes: 0 },
      vault: { count: 0, bytes: 0 },
    };

    for (const f of files) {
      totalBytes += f.sizeBytes;
      if (f.fileType === 'image') {
        byType.images.count++;
        byType.images.bytes += f.sizeBytes;
      } else if (f.fileType === 'video') {
        byType.videos.count++;
        byType.videos.bytes += f.sizeBytes;
      } else if (f.fileType === 'audio') {
        byType.audio.count++;
        byType.audio.bytes += f.sizeBytes;
      } else {
        byType.documents.count++;
        byType.documents.bytes += f.sizeBytes;
      }
    }

    const limitBytes = 1073741824; // 1 GB free tier
    const usedPercentage = Math.min(100, Math.round((totalBytes / limitBytes) * 100));

    return { totalBytes, limitBytes, usedPercentage, byType };
  },

  // Downloads functionality
  getDownloadedTracks: () => {
    return get().files
      .filter(f => f.fileType === 'audio' && !f.isDeleted)
      .map(f => ({
        id: f.id,
        url: f.uri || f.storagePath,
        title: f.title || f.name.replace(/\.[^/.]+$/, ''),
        artist: f.artist || 'Downloaded Track',
        album: f.album || 'AK Music',
        artwork: f.thumbnailPath || f.uri || f.storagePath,
        duration: f.durationSeconds ? f.durationSeconds * 1000 : 180000,
      }));
  },

  isDownloaded: (trackId: string) => {
    return get().files.some(f => f.fileType === 'audio' && !f.isDeleted && f.id === trackId);
  },

  markAsDownloaded: (trackId: string) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === trackId ? { ...f, isFavourite: true } : f
      ),
    }));
    saveLocalCache(get().files, get().folders);
  },

  // Cover image resizing utility - creates optimized thumbnails
  createOptimizedThumbnail: async (imageUrl: string, width = 180, height = 180): Promise<string> => {
    if (!imageUrl) return imageUrl;

    // Handle local files - try to resize locally
    if (Platform.OS !== 'web' && (imageUrl.startsWith('file:') || imageUrl.includes('nexora_storage'))) {
      try {
        // For now, just return the local path - in production you'd use expo-image or similar
        // to actually resize the image
        return imageUrl;
      } catch {
        return imageUrl;
      }
    }

    // For remote URLs, try to get a smaller version
    if (imageUrl.includes('unsplash.com')) {
      // Unsplash supports dynamic resizing
      return imageUrl + `&w=${width}&h=${height}&fit=crop&crop=entropy`;
    }

    if (imageUrl.includes('ytimg.com')) {
      // YouTube thumbnails - use mqdefault (320x180) or hqdefault (480x360)
      return imageUrl.replace('hqdefault.jpg', 'mqdefault.jpg');
    }

    // For other URLs, just return as-is
    return imageUrl;
  },
}));
