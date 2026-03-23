-- AlterTable: make password_hash nullable for SSO-only users
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: add entra_id and auth_provider columns
ALTER TABLE "users" ADD COLUMN "entra_id" TEXT;
ALTER TABLE "users" ADD COLUMN "auth_provider" TEXT NOT NULL DEFAULT 'local';

-- CreateIndex: unique constraint on entra_id for SSO user lookup
CREATE UNIQUE INDEX "users_entra_id_key" ON "users"("entra_id");
