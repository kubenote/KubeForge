export interface IStorageProvider {
  save(id: string, content: string): Promise<void>;
  read(id: string): Promise<string>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
