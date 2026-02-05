import type { IStorageProvider } from './storage-provider.interface';
import { FilesystemStorageProvider } from './filesystem.storage-provider';

let storageProvider: IStorageProvider = new FilesystemStorageProvider();

export function getStorageProvider(): IStorageProvider {
  return storageProvider;
}

export function setStorageProvider(provider: IStorageProvider): void {
  storageProvider = provider;
}
