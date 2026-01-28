import { writeFile, readFile, unlink, mkdir, access } from 'fs/promises';
import path from 'path';
import type { IStorageProvider } from './IStorageProvider';

export class FilesystemStorageProvider implements IStorageProvider {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), '.next/hosted-yaml');
  }

  async save(id: string, content: string): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    const filePath = path.join(this.baseDir, `${id}.yml`);
    await writeFile(filePath, content, 'utf8');
  }

  async read(id: string): Promise<string> {
    const filePath = path.join(this.baseDir, `${id}.yml`);
    return readFile(filePath, 'utf8');
  }

  async delete(id: string): Promise<void> {
    const filePath = path.join(this.baseDir, `${id}.yml`);
    await unlink(filePath);
  }

  async exists(id: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, `${id}.yml`);
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
