// ==============================================================================
// NEXORA MEDIA IMPORT & PICKER SERVICE
// System picker integration for photos, videos, audio, PDFs and documents
// ==============================================================================

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export interface PickedMedia {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export async function pickMediaFromLibrary(
  mediaTypes: 'images' | 'videos' | 'all' = 'all'
): Promise<PickedMedia | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Media library permission is required to import files.');
  }

  let typeOption: ImagePicker.MediaType[] = ['images', 'videos'];
  if (mediaTypes === 'images') typeOption = ['images'];
  if (mediaTypes === 'videos') typeOption = ['videos'];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: typeOption,
    allowsEditing: false,
    quality: 0.9,
    base64: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  let size = asset.fileSize || 1024000;
  try {
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (fileInfo.exists && !fileInfo.isDirectory && fileInfo.size) {
      size = fileInfo.size;
    }
  } catch (e) {
    // Fallback to asset fileSize
  }

  const fileName = asset.fileName || `media_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
  const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

  return {
    uri: asset.uri,
    name: fileName,
    mimeType,
    size,
    width: asset.width,
    height: asset.height,
    duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
  };
}

export async function takePhotoWithCamera(): Promise<PickedMedia | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to capture photos.');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.9,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  let size = asset.fileSize || 1200000;
  try {
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (fileInfo.exists && !fileInfo.isDirectory && fileInfo.size) {
      size = fileInfo.size;
    }
  } catch (e) {}

  const fileName = asset.fileName || `vault_camera_${Date.now()}.jpg`;
  const mimeType = asset.mimeType || 'image/jpeg';

  return {
    uri: asset.uri,
    name: fileName,
    mimeType,
    size,
    width: asset.width,
    height: asset.height,
  };
}

export async function pickDocumentFromSystem(): Promise<PickedMedia | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType || 'application/octet-stream',
    size: asset.size || 1024000,
  };
}

export async function pickMultipleMediaFromLibrary(
  mediaTypes: 'images' | 'videos' | 'all' = 'all'
): Promise<PickedMedia[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Media library permission is required to import files.');
  }

  let typeOption: ImagePicker.MediaType[] = ['images', 'videos'];
  if (mediaTypes === 'images') typeOption = ['images'];
  if (mediaTypes === 'videos') typeOption = ['videos'];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: typeOption,
    allowsMultipleSelection: true,
    selectionLimit: 0,
    allowsEditing: false,
    quality: 0.9,
    base64: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return [];
  }

  const items: PickedMedia[] = [];
  for (const asset of result.assets) {
    let size = asset.fileSize || 1024000;
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && !fileInfo.isDirectory && fileInfo.size) {
        size = fileInfo.size;
      }
    } catch {}

    const isVideo = asset.type === 'video' || (asset.mimeType && asset.mimeType.startsWith('video/'));
    const fileName =
      asset.fileName ||
      `media_${Date.now()}_${Math.floor(Math.random() * 1000)}.${isVideo ? 'mp4' : 'jpg'}`;
    const mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');

    items.push({
      uri: asset.uri,
      name: fileName,
      mimeType,
      size,
      width: asset.width,
      height: asset.height,
      duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
    });
  }

  return items;
}

export async function pickMultipleAudioFiles(): Promise<PickedMedia[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return [];
  }

  return result.assets.map(asset => ({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType || 'audio/mpeg',
    size: asset.size || 1024000,
  }));
}

export async function pickMultipleDocumentsFromSystem(
  types: string | string[] = '*/*'
): Promise<PickedMedia[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return [];
  }

  return result.assets.map(asset => ({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType || 'application/octet-stream',
    size: asset.size || 1024000,
  }));
}

