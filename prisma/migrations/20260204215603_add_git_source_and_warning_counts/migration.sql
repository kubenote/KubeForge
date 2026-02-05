-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "error_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gitSource" JSONB,
ADD COLUMN     "warning_count" INTEGER NOT NULL DEFAULT 0;
