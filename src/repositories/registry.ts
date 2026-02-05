import type { IProjectRepository } from './interfaces/project.repository.interface';
import type { IHostedYamlRepository } from './interfaces/hosted-yaml.repository.interface';
import type { ISchemaRepository } from './interfaces/schema.repository.interface';
import { PrismaProjectRepository } from './implementations/prisma.project.repository';
import { PrismaHostedYamlRepository } from './implementations/prisma.hosted-yaml.repository';
import { PrismaSchemaRepository } from './implementations/prisma.schema.repository';

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
