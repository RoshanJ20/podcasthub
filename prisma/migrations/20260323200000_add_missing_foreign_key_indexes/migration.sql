-- Add missing indexes on foreign key columns to prevent full table scans.
-- These indexes improve query performance for JOIN and WHERE operations.

-- Transcript: queries filtering by auditBriefId (already has unique on [auditBriefId, transcriptType])
CREATE INDEX "transcripts_audit_brief_id_idx" ON "transcripts"("audit_brief_id");

-- LearningPathEdge: queries filtering by source or target episode
CREATE INDEX "learning_path_edges_source_episode_id_idx" ON "learning_path_edges"("source_episode_id");
CREATE INDEX "learning_path_edges_target_episode_id_idx" ON "learning_path_edges"("target_episode_id");

-- LearningGraph: queries filtering by creator
CREATE INDEX "learning_graphs_created_by_idx" ON "learning_graphs"("created_by");

-- UserActivity: queries filtering by optional foreign keys used in analytics
CREATE INDEX "user_activity_audit_brief_id_idx" ON "user_activity"("audit_brief_id");
CREATE INDEX "user_activity_episode_id_idx" ON "user_activity"("episode_id");
CREATE INDEX "user_activity_graph_id_idx" ON "user_activity"("graph_id");
