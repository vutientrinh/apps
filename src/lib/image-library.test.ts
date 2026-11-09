import { Asset, requestPermissionsAsync, type PermissionResponse } from 'expo-media-library';
import { saveImageToLibrary } from './image-library';

jest.mock('expo-media-library', () => ({
  Asset: { create: jest.fn() },
  requestPermissionsAsync: jest.fn(),
}));

const createAsset = jest.mocked(Asset.create);
const requestPermission = jest.mocked(requestPermissionsAsync);
const grantedPermission: PermissionResponse = {
  granted: true,
  canAskAgain: true,
  status: 'granted' as PermissionResponse['status'],
  expires: 'never',
};

describe('saveImageToLibrary', () => {
  beforeEach(() => {
    createAsset.mockReset();
    requestPermission.mockReset();
  });

  it('asks for write permission and saves a local image', async () => {
    requestPermission.mockResolvedValue(grantedPermission);
    createAsset.mockResolvedValue({} as Awaited<ReturnType<typeof Asset.create>>);

    await expect(saveImageToLibrary('file:///cache/receipt.png')).resolves.toEqual({
      ok: true,
      message: 'Saved to your photo library.',
    });
    expect(requestPermission).toHaveBeenCalledWith(true);
    expect(createAsset).toHaveBeenCalledWith('file:///cache/receipt.png');
  });

  it('returns a friendly message when permission is denied', async () => {
    requestPermission.mockResolvedValue({ ...grantedPermission, granted: false, canAskAgain: false, status: 'denied' as PermissionResponse['status'] });

    await expect(saveImageToLibrary('file:///cache/receipt.png')).resolves.toEqual({
      ok: false,
      message: 'Photo library access is turned off. Enable it in your device settings to save this image.',
    });
    expect(createAsset).not.toHaveBeenCalled();
  });

  it('rejects non-local inputs and reports library failures safely', async () => {
    await expect(saveImageToLibrary('https://example.test/receipt.png')).resolves.toMatchObject({ ok: false });
    expect(requestPermission).not.toHaveBeenCalled();

    requestPermission.mockResolvedValue(grantedPermission);
    createAsset.mockRejectedValue(new Error('native error'));
    await expect(saveImageToLibrary('file:///cache/receipt.png')).resolves.toEqual({
      ok: false,
      message: 'Could not save this image. Please try again.',
    });
  });
});
