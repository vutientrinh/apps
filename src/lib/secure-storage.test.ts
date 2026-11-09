import { createStorageAdapter } from './secure-storage';

describe('web storage adapter', () => {
  it('reads, writes and removes values through localStorage', async () => {
    const data = new Map<string, string>();
    const localStorageMock = {
      getItem: jest.fn((key: string) => data.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => { data.set(key, value); }),
      removeItem: jest.fn((key: string) => { data.delete(key); }),
    };
    const previousStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock });

    try {
      const storage = createStorageAdapter('web');
      await storage.setItemAsync('intro-complete', 'true');
      await expect(storage.getItemAsync('intro-complete')).resolves.toBe('true');
      await storage.deleteItemAsync('intro-complete');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('intro-complete', 'true');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('intro-complete');
      await expect(storage.getItemAsync('intro-complete')).resolves.toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
    }
  });
});
