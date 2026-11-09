import { Asset, requestPermissionsAsync } from 'expo-media-library';

export type SaveImageResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** Saves a local image file to the device photo library after asking for permission. */
export async function saveImageToLibrary(uri: string): Promise<SaveImageResult> {
  const localUri = uri.trim();
  if (!localUri.startsWith('file://') || !/\.[a-z\d]+(?:[?#].*)?$/i.test(localUri)) {
    return { ok: false, message: 'This image cannot be saved yet. Try generating or taking it again.' };
  }

  try {
    const permission = await requestPermissionsAsync(true);
    if (!permission.granted) {
      return {
        ok: false,
        message: permission.canAskAgain
          ? 'Allow photo library access to save this image.'
          : 'Photo library access is turned off. Enable it in your device settings to save this image.',
      };
    }

    await Asset.create(localUri);
    return { ok: true, message: 'Saved to your photo library.' };
  } catch {
    return { ok: false, message: 'Could not save this image. Please try again.' };
  }
}
