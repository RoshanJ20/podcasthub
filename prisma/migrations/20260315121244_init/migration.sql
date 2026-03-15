-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "podcasts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail_url" TEXT NOT NULL,
    "audio_short_url" TEXT NOT NULL,
    "audio_long_url" TEXT,
    "bulletin_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "podcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "podcast_id" UUID NOT NULL,
    "full_text" TEXT NOT NULL,
    "segments" JSONB NOT NULL DEFAULT '[]',
    "embedding" vector(1536),
    "transcript_type" TEXT NOT NULL DEFAULT 'short',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_graphs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT NOT NULL,
    "path_type" TEXT NOT NULL DEFAULT 'linear',
    "thumbnail_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_graphs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "graph_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audio_url" TEXT NOT NULL,
    "transcript" JSONB NOT NULL DEFAULT '[]',
    "position_x" REAL NOT NULL DEFAULT 0,
    "position_y" REAL NOT NULL DEFAULT 0,
    "node_type" TEXT NOT NULL DEFAULT 'default',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_edges" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "graph_id" UUID NOT NULL,
    "source_episode_id" UUID NOT NULL,
    "target_episode_id" UUID NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "podcast_id" UUID NOT NULL,
    "timestamp_seconds" REAL NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "graph_id" UUID NOT NULL,
    "episode_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "activity_type" TEXT NOT NULL,
    "podcast_id" UUID,
    "episode_id" UUID,
    "graph_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_podcast_id_transcript_type_key" ON "transcripts"("podcast_id", "transcript_type");

-- CreateIndex
CREATE INDEX "episodes_graph_id_idx" ON "episodes"("graph_id");

-- CreateIndex
CREATE INDEX "learning_path_edges_graph_id_idx" ON "learning_path_edges"("graph_id");

-- CreateIndex
CREATE INDEX "bookmarks_user_id_idx" ON "bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "bookmarks_podcast_id_idx" ON "bookmarks"("podcast_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_key" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_progress_user_id_idx" ON "user_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_progress_graph_id_idx" ON "user_progress"("graph_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_id_episode_id_key" ON "user_progress"("user_id", "episode_id");

-- CreateIndex
CREATE INDEX "user_activity_user_id_idx" ON "user_activity"("user_id");

-- CreateIndex
CREATE INDEX "user_activity_activity_type_idx" ON "user_activity"("activity_type");

-- CreateIndex
CREATE INDEX "user_activity_created_at_idx" ON "user_activity"("created_at");

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_podcast_id_fkey" FOREIGN KEY ("podcast_id") REFERENCES "podcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_graphs" ADD CONSTRAINT "learning_graphs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "learning_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_edges" ADD CONSTRAINT "learning_path_edges_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "learning_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_edges" ADD CONSTRAINT "learning_path_edges_source_episode_id_fkey" FOREIGN KEY ("source_episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_edges" ADD CONSTRAINT "learning_path_edges_target_episode_id_fkey" FOREIGN KEY ("target_episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_podcast_id_fkey" FOREIGN KEY ("podcast_id") REFERENCES "podcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "learning_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_podcast_id_fkey" FOREIGN KEY ("podcast_id") REFERENCES "podcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "learning_graphs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
