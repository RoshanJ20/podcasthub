-- Ensure exactly one of audit_brief_id or episode_id is set on each bookmark.
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_owner_check"
  CHECK (
    (audit_brief_id IS NOT NULL AND episode_id IS NULL)
    OR (audit_brief_id IS NULL AND episode_id IS NOT NULL)
  );
