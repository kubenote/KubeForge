import type { IProjectRepository } from './interfaces/IProjectRepository';
import type { IHostedYamlRepository } from './interfaces/IHostedYamlRepository';
import type { ISchemaRepository } from './interfaces/ISchemaRepository';
import { PrismaProjectRepository } from './implementations/PrismaProjectRepository';
import { PrismaHostedYamlRepository } from './implementations/PrismaHostedYamlRepository';
import { PrismaSchemaRepository } from './implementations/PrismaSchemaRepository';

let projectRepository: IProjectRepository = new PrismaProjectRepository();
let hostedYamlRepository: IHostedYamlRepository = new PrismaHostedYamlRepository();
let schemaRepository: ISchemaRepository = new PrismaSchemaRepository();

export function getProjectRepository(): IProjectRepository {
  return projectRepository;
}

export function setProjectRepository(repo: IProjectRepository): void {
  projectRepository = repo;
}

export function getHostedYamlRepository(): IHostedYamlRepository {
  return hostedYamlRepository;
}

export function setHostedYamlRepository(repo: IHostedYamlRepository): void {
  hostedYamlRepository = repo;
}

export function getSchemaRepository(): ISchemaRepository {
  return schemaRepository;
}

export function setSchemaRepository(repo: ISchemaRepository): void {
  schemaRepository = repo;
}
