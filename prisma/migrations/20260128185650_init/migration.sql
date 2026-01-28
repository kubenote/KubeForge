-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kubernetesVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_versions" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "projectId" TEXT NOT NULL,
    "nodes" TEXT NOT NULL,
    "edges" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hosted_yamls" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT,
    "yamlHash" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "hosted_yamls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kubernetes_schemas" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "schemaKey" TEXT NOT NULL,
    "schemaData" TEXT NOT NULL,
    "isFullyResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kubernetes_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schema_gvks" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "gvkVersion" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schema_gvks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "public"."projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "public"."projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_slug_key" ON "public"."project_versions"("slug");

-- CreateIndex
CREATE INDEX "kubernetes_schemas_version_idx" ON "public"."kubernetes_schemas"("version");

-- CreateIndex
CREATE UNIQUE INDEX "kubernetes_schemas_version_schemaKey_isFullyResolved_key" ON "public"."kubernetes_schemas"("version", "schemaKey", "isFullyResolved");

-- CreateIndex
CREATE INDEX "schema_gvks_version_idx" ON "public"."schema_gvks"("version");

-- CreateIndex
CREATE UNIQUE INDEX "schema_gvks_version_group_gvkVersion_kind_key" ON "public"."schema_gvks"("version", "group", "gvkVersion", "kind");

-- AddForeignKey
ALTER TABLE "public"."project_versions" ADD CONSTRAINT "project_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hosted_yamls" ADD CONSTRAINT "hosted_yamls_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
