/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `project_versions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "project_versions" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_slug_key" ON "project_versions"("slug");
