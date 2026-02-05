export type { IStorageProvider } from './storage-provider.interface';
export { FilesystemStorageProvider } from './filesystem.storage-provider';
export { getStorageProvider, setStorageProvider } from './registry';
