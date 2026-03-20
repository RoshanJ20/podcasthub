-- AlterTable
ALTER TABLE "audit_briefs" RENAME CONSTRAINT "podcasts_pkey" TO "audit_briefs_pkey";

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "audit_brief_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "favorites_audit_brief_id_idx" ON "favorites"("audit_brief_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_audit_brief_id_key" ON "favorites"("user_id", "audit_brief_id");

-- RenameForeignKey
ALTER TABLE "bookmarks" RENAME CONSTRAINT "bookmarks_podcast_id_fkey" TO "bookmarks_audit_brief_id_fkey";

-- RenameForeignKey
ALTER TABLE "transcripts" RENAME CONSTRAINT "transcripts_podcast_id_fkey" TO "transcripts_audit_brief_id_fkey";

-- RenameForeignKey
ALTER TABLE "user_activity" RENAME CONSTRAINT "user_activity_podcast_id_fkey" TO "user_activity_audit_brief_id_fkey";

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_audit_brief_id_fkey" FOREIGN KEY ("audit_brief_id") REFERENCES "audit_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "bookmarks_podcast_id_idx" RENAME TO "bookmarks_audit_brief_id_idx";

-- RenameIndex
ALTER INDEX "transcripts_podcast_id_transcript_type_key" RENAME TO "transcripts_audit_brief_id_transcript_type_key";
