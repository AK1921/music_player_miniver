// ==============================================================================
// NEXORA TYPES & INTERFACES
// ==============================================================================

export type MediaType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

export interface UserPreferences {
  themeId: string;
  colorMode: 'dark' | 'light' | 'system';
  biometricsEnabled: boolean;
  autoLockVault: boolean;
  recycleBinRetentionDays: number;
  audioVisualizerStyle: 'bars' | 'wave' | 'circle';
  compactView: boolean;
}

export interface MediaFolder {
  id: string;
  userId: string;
  parentId?: string | null;
  name: string;
  color: string;
  icon: string;
  fileCount?: number;
  coverUri?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  userId: string;
  folderId?: string | null;
  name: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  fileType: MediaType;
  sizeBytes: number;
  thumbnailPath?: string | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  artist?: string | null;
  album?: string | null;
  title?: string | null;
  isFavourite: boolean;
  isDeleted: boolean;
  deletedAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  uri?: string; // local or signed url
}

export interface VaultItem {
  id: string;
  userId: string;
  storagePath: string;
  localEncryptedPath?: string;
  encryptedName: string;
  encryptedMimeType: string;
  nonce: string; // IV
  salt: string;  // Salt
  sizeBytes: number;
  authTag: string;
  createdAt: string;
  // Decrypted transient data (in-memory only, never persisted to disk)
  decryptedUri?: string;
  decryptedName?: string;
  decryptedType?: MediaType;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string;
  coverUrl?: string;
  isPublic: boolean;
  itemCount?: number;
  trackIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number; // seconds
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isCompleted: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileActivityLog {
  id: string;
  userId: string;
  mediaFileId?: string;
  action: 'upload' | 'delete' | 'soft_delete' | 'restore' | 'rename' | 'move' | 'vault_lock' | 'vault_unlock' | 'share';
  details?: Record<string, any>;
  createdAt: string;
}

export interface ThemeColors {
  id: string;
  name: string;
  isDark: boolean;
  background: string;
  surface: string;
  surfaceHover: string;
  card: string;
  border: string;
  primary: string;
  primaryGlow: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  success: string;
  warning: string;
  danger: string;
  badge: string;
}

export interface StorageAnalytics {
  totalBytes: number;
  limitBytes: number;
  usedPercentage: number;
  byType: {
    images: { count: number; bytes: number };
    videos: { count: number; bytes: number };
    audio: { count: number; bytes: number };
    documents: { count: number; bytes: number };
    vault: { count: number; bytes: number };
  };
}

