-- CreateTable
CREATE TABLE "learning_graph_favorites" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "learning_graph_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_graph_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_graph_favorites_user_id_idx" ON "learning_graph_favorites"("user_id");

-- CreateIndex
CREATE INDEX "learning_graph_favorites_learning_graph_id_idx" ON "learning_graph_favorites"("learning_graph_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_graph_favorites_user_id_learning_graph_id_key" ON "learning_graph_favorites"("user_id", "learning_graph_id");

-- AddForeignKey
ALTER TABLE "learning_graph_favorites" ADD CONSTRAINT "learning_graph_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_graph_favorites" ADD CONSTRAINT "learning_graph_favorites_learning_graph_id_fkey" FOREIGN KEY ("learning_graph_id") REFERENCES "learning_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
