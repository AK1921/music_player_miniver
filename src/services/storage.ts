// ==============================================================================
// NEXORA STORAGE ABSTRACTION LAYER (IStorageService)
// Resilient local persistence + Cloud Supabase sync
// ==============================================================================

import { supabase, isConfigured } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface UploadOptions {
  bucket: 'media-files' | 'media-vault' | 'media-thumbnails';
  path: string;
  uri: string;
  mimeType: string;
  onProgress?: (progress: number) => void;
}

export interface IStorageService {
  uploadFile(options: UploadOptions): Promise<{ storagePath: string; fullUrl?: string }>;
  persistLocalFile(uri: string, filenamePrefix?: string): Promise<string>;
  getSignedUrl(bucket: string, storagePath: string, expiresInSeconds?: number): Promise<string>;
  deleteFile(bucket: string, storagePath: string): Promise<void>;
  downloadToCache(bucket: string, storagePath: string): Promise<string>;
}

class SupabaseStorageService implements IStorageService {
  private persistentDir = `${FileSystem.documentDirectory || ''}nexora_storage/`;

  private async ensureStorageDir() {
    if (Platform.OS === 'web') return;
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.persistentDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.persistentDir, { intermediates: true });
      }
    } catch (e) {
      // Ignore if directory already exists
    }
  }

  async persistLocalFile(uri: string, filenamePrefix = 'media'): Promise<string> {
    if (!uri) return uri;
    if (Platform.OS === 'web' || uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    if (this.persistentDir && uri.includes('nexora_storage')) {
      return uri;
    }

    try {
      await this.ensureStorageDir();
      let ext = 'jpg';
      const cleanUri = uri.split('?')[0];
      const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
      if (match && match[1] && match[1].length <= 5) {
        ext = match[1];
      }

      const safePrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeName = `${safePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const localDest = `${this.persistentDir}${safeName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: localDest,
      });

      const check = await FileSystem.getInfoAsync(localDest);
      if (check.exists) {
        return localDest;
      }
      return uri;
    } catch (e: any) {
      console.log('[NEXORA Storage] persistLocalFile notice:', e?.message);
      return uri;
    }
  }

  async uploadFile(options: UploadOptions): Promise<{ storagePath: string; fullUrl?: string }> {
    let finalUri = options.uri;

    // 1. Permanently copy file to app's private document directory so it never vanishes
    if (Platform.OS !== 'web' && options.uri && !options.uri.startsWith('http')) {
      try {
        await this.ensureStorageDir();
        const safeName = `${Date.now()}_${options.path.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const localDest = `${this.persistentDir}${safeName}`;
        
        await FileSystem.copyAsync({
          from: options.uri,
          to: localDest,
        });

        const check = await FileSystem.getInfoAsync(localDest);
        if (check.exists) {
          finalUri = localDest;
        }
      } catch (copyErr) {
        // Fallback to original URI if copy is not needed or fails
        console.log('[NEXORA Storage] Local persist notice:', (copyErr as any)?.message);
      }
    }

    // 2. Sync to Supabase Storage if authenticated
    if (isConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const targetStoragePath = `${user.id}/${options.path}`;
          let fileData: any;

          if (Platform.OS === 'web') {
            const res = await fetch(finalUri);
            fileData = await res.blob();
          } else {
            const base64 = await FileSystem.readAsStringAsync(finalUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            fileData = bytes.buffer;
          }

          const { data, error } = await supabase.storage
            .from(options.bucket)
            .upload(targetStoragePath, fileData, {
              contentType: options.mimeType,
              upsert: true,
            });

          if (!error && data) {
            return { storagePath: data.path, fullUrl: finalUri };
          }
        }
      } catch (cloudErr) {
        // Graceful cloud offline mode: Keep local copy safe
      }
    }

    // Always succeed with persistent local URI
    return { storagePath: finalUri, fullUrl: finalUri };
  }

  async getSignedUrl(bucket: string, storagePath: string, expiresInSeconds = 900): Promise<string> {
    if (!isConfigured || storagePath.startsWith('file:') || storagePath.startsWith('content:')) {
      return storagePath;
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error || !data) {
        return storagePath;
      }
      return data.signedUrl;
    } catch {
      return storagePath;
    }
  }

  async deleteFile(bucket: string, storagePath: string): Promise<void> {
    // Delete local copy if present
    if (storagePath.startsWith('file:') || storagePath.includes('nexora_storage')) {
      try {
        await FileSystem.deleteAsync(storagePath, { idempotent: true });
      } catch {}
    }

    if (!isConfigured) return;

    try {
      await supabase.storage.from(bucket).remove([storagePath]);
    } catch (e: any) {
      // Ignored
    }
  }

  async downloadToCache(bucket: string, storagePath: string): Promise<string> {
    if (Platform.OS === 'web' || !isConfigured || storagePath.startsWith('file:')) {
      return storagePath;
    }

    try {
      const cacheDir = FileSystem.cacheDirectory || '';
      const localUri = `${cacheDir}${storagePath.replace(/\//g, '_')}`;

      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        return localUri;
      }

      const signedUrl = await this.getSignedUrl(bucket, storagePath, 1800);
      if (signedUrl.startsWith('http')) {
        const downloadRes = await FileSystem.downloadAsync(signedUrl, localUri);
        return downloadRes.uri;
      }
      return storagePath;
    } catch {
      return storagePath;
    }
  }
}

export const StorageService: IStorageService = new SupabaseStorageService();
