// ==============================================================================
// NEXORA LIBRARY BACKUP & DISASTER RECOVERY SERVICE
// Export and Restore 52+ Songs, Playlists, Metadata & Cover Art References
// ==============================================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useMediaStore } from '../stores/mediaStore';
import { usePlayerStore } from '../stores/playerStore';

export interface LibraryBackupPayload {
  version: string;
  exportDate: string;
  files: any[];
  folders: any[];
  playlists: any[];
}

export class BackupService {
  /**
   * Export the entire library (all songs, videos, folders, playlists) to a portable JSON backup.
   * Prompts the phone's native Share Sheet to save to Downloads, Google Drive, WhatsApp, etc.
   */
  static async exportLibraryBackup(): Promise<{ success: boolean; message: string }> {
    try {
      const { files, folders } = useMediaStore.getState();
      const { playlists } = usePlayerStore.getState();

      const backupData: LibraryBackupPayload = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        files: files || [],
        folders: folders || [],
        playlists: playlists || [],
      };

      const backupJson = JSON.stringify(backupData, null, 2);
      const backupPath = `${FileSystem.cacheDirectory || ''}nexora_library_backup.json`;

      await FileSystem.writeAsStringAsync(backupPath, backupJson);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(backupPath, {
          mimeType: 'application/json',
          dialogTitle: 'Save Nexora Library Backup (Songs & Playlists)',
          UTI: 'public.json',
        });
        return {
          success: true,
          message: `Backup created! Successfully exported ${files.length} items and ${playlists.length} playlists.`,
        };
      } else {
        return {
          success: true,
          message: `Backup saved to internal storage at ${backupPath}.`,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Failed to create backup.',
      };
    }
  }

  /**
   * Restore the library from a previously exported JSON backup file.
   * Recovers songs, folders, custom playlists, and artwork links.
   */
  static async restoreLibraryBackup(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets || picked.assets.length === 0) {
        return { success: false, count: 0, message: 'Restore cancelled.' };
      }

      const asset = picked.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri);
      const parsed: LibraryBackupPayload = JSON.parse(content);

      if (!parsed || !Array.isArray(parsed.files)) {
        return { success: false, count: 0, message: 'Invalid backup file format.' };
      }

      // Restore Files & Folders into mediaStore
      const currentFiles = useMediaStore.getState().files;
      const existingIds = new Set(currentFiles.map(f => f.id));
      const mergedFiles = [...currentFiles];

      for (const f of parsed.files) {
        if (!existingIds.has(f.id)) {
          mergedFiles.push(f);
        }
      }

      const currentFolders = useMediaStore.getState().folders;
      const existingFolderIds = new Set(currentFolders.map(f => f.id));
      const mergedFolders = [...currentFolders];

      if (Array.isArray(parsed.folders)) {
        for (const fld of parsed.folders) {
          if (!existingFolderIds.has(fld.id)) {
            mergedFolders.push(fld);
          }
        }
      }

      useMediaStore.setState({
        files: mergedFiles,
        folders: mergedFolders,
      });

      // Write to persistent cache file
      const META_CACHE_FILE = `${FileSystem.documentDirectory || ''}nexora_files_meta.json`;
      await FileSystem.writeAsStringAsync(
        META_CACHE_FILE,
        JSON.stringify({ files: mergedFiles, folders: mergedFolders })
      );

      // Restore Playlists into playerStore
      if (Array.isArray(parsed.playlists)) {
        const currentPlaylists = usePlayerStore.getState().playlists;
        const existingPlaylistIds = new Set(currentPlaylists.map(p => p.id));
        const mergedPlaylists = [...currentPlaylists];

        for (const pl of parsed.playlists) {
          if (!existingPlaylistIds.has(pl.id)) {
            mergedPlaylists.push(pl);
          }
        }

        usePlayerStore.setState({ playlists: mergedPlaylists });

        const PLAYLISTS_CACHE_FILE = `${FileSystem.documentDirectory || ''}nexora_playlists.json`;
        await FileSystem.writeAsStringAsync(
          PLAYLISTS_CACHE_FILE,
          JSON.stringify(mergedPlaylists)
        );
      }

      return {
        success: true,
        count: parsed.files.length,
        message: `Library restored! ${parsed.files.length} items and ${parsed.playlists?.length || 0} playlists recovered.`,
      };
    } catch (e: any) {
      return {
        success: false,
        count: 0,
        message: e?.message || 'Failed to restore backup.',
      };
    }
  }
}
