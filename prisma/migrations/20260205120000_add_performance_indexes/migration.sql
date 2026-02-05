-- CreateIndex
CREATE INDEX "project_versions_projectId_idx" ON "project_versions"("projectId");

-- CreateIndex
CREATE INDEX "project_versions_createdAt_idx" ON "project_versions"("createdAt");

-- CreateIndex
CREATE INDEX "hosted_yamls_yamlHash_idx" ON "hosted_yamls"("yamlHash");

-- CreateIndex
CREATE INDEX "hosted_yamls_createdAt_idx" ON "hosted_yamls"("createdAt");
