-- AlterTable
ALTER TABLE "usuario" ADD COLUMN "obra_id" UUID;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
