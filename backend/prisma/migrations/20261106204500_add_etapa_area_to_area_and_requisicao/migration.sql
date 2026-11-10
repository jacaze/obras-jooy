-- CreateEnum
CREATE TYPE "StatusEtapa" AS ENUM ('EM_ANDAMENTO', 'ENCERRADA');

-- CreateTable
CREATE TABLE "etapa_area" (
    "id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusEtapa" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerrada_em" TIMESTAMP(3),

    CONSTRAINT "etapa_area_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "requisicao" ADD COLUMN "etapa_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "etapa_area_nome_unico" ON "etapa_area"("area_id", "nome");

-- AddForeignKey
ALTER TABLE "etapa_area" ADD CONSTRAINT "etapa_area_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area_obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicao" ADD CONSTRAINT "requisicao_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "etapa_area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
