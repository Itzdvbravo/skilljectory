import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Universal PNG Saver & Sharer
 * - On Web: Triggers browser file download of the real PNG.
 * - On Mobile (Android/iOS): Saves the real PNG to local device storage and launches native sharing sheet (Save to Photos, WhatsApp, Files, etc.).
 */
export async function saveOrSharePng(
  pngBase64: string,
  fileName: string,
  dialogTitle: string = 'Share Image'
): Promise<boolean> {
  const safeName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  const pureBase64 = pngBase64.includes('base64,')
    ? pngBase64.split('base64,')[1]
    : pngBase64;

  const dataUri = `data:image/png;base64,${pureBase64}`;

  // 1. Web browser download handling
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      try {
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = safeName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Download Started', `Saved "${safeName}" to your downloads folder.`);
        return true;
      } catch (err: any) {
        Alert.alert('Download Failed', err.message || 'Could not download PNG file');
        return false;
      }
    }
  }

  // 2. Native Mobile (Android & iOS) handling via FileSystem & Sharing
  try {
    const fileUri = `${FileSystem.cacheDirectory}${safeName}`;
    await FileSystem.writeAsStringAsync(fileUri, pureBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle,
        UTI: 'public.png',
      });
      return true;
    } else {
      Alert.alert('Saved to Device', `Image saved to: ${fileUri}`);
      return true;
    }
  } catch (err: any) {
    Alert.alert('Save Error', err.message || 'Could not save or share PNG file');
    return false;
  }
}
