import type { IStorageProvider } from './IStorageProvider';
import { FilesystemStorageProvider } from './FilesystemStorageProvider';

let storageProvider: IStorageProvider = new FilesystemStorageProvider();

export function getStorageProvider(): IStorageProvider {
  return storageProvider;
}

export function setStorageProvider(provider: IStorageProvider): void {
  storageProvider = provider;
}
