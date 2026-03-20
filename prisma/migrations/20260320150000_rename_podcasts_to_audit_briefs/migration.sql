-- Rename podcasts table to audit_briefs
ALTER TABLE "podcasts" RENAME TO "audit_briefs";

-- Rename podcast_id foreign key columns
ALTER TABLE "transcripts" RENAME COLUMN "podcast_id" TO "audit_brief_id";
ALTER TABLE "bookmarks" RENAME COLUMN "podcast_id" TO "audit_brief_id";
ALTER TABLE "user_activity" RENAME COLUMN "podcast_id" TO "audit_brief_id";
