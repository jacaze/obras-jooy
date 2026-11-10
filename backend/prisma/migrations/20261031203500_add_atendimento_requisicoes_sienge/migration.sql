-- AlterTable
ALTER TABLE "requisicao"
ADD COLUMN "retirado_por" VARCHAR(120),
ADD COLUMN "atendido_por_id" UUID,
ADD COLUMN "atendido_em" TIMESTAMP(3),
ADD COLUMN "exportada_sienge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "exportada_em" TIMESTAMP(3),
ADD COLUMN "exportada_por_id" UUID;

-- AlterTable
ALTER TABLE "requisicao_item"
ADD COLUMN "quantidade_entregue" DECIMAL(12,4);

-- AddForeignKey
ALTER TABLE "requisicao" ADD CONSTRAINT "requisicao_atendido_por_id_fkey" FOREIGN KEY ("atendido_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicao" ADD CONSTRAINT "requisicao_exportada_por_id_fkey" FOREIGN KEY ("exportada_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
