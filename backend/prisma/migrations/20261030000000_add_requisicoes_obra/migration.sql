-- CreateEnum
CREATE TYPE "StatusRequisicao" AS ENUM ('SOLICITADA', 'EM_SEPARACAO', 'PRONTA', 'ATENDIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "requisicao" (
    "id" UUID NOT NULL,
    "numero_sequencial" SERIAL NOT NULL,
    "area_id" UUID NOT NULL,
    "requisitante_id" UUID NOT NULL,
    "status" "StatusRequisicao" NOT NULL DEFAULT 'SOLICITADA',
    "codigo_retirada" VARCHAR(12),
    "chave_idempotencia" VARCHAR(100),
    "observacao" VARCHAR(255),
    "solicitada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pronta_em" TIMESTAMP(3),
    "retirada_em" TIMESTAMP(3),

    CONSTRAINT "requisicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisicao_item" (
    "id" UUID NOT NULL,
    "requisicao_id" UUID NOT NULL,
    "material_id" UUID,
    "ferramenta_id" UUID,
    "quantidade" DECIMAL(12,4) NOT NULL DEFAULT 1.0,

    CONSTRAINT "requisicao_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "requisicao_codigo_retirada_key" ON "requisicao"("codigo_retirada");

-- CreateIndex
CREATE UNIQUE INDEX "requisicao_chave_idempotencia_key" ON "requisicao"("chave_idempotencia");

-- AddForeignKey
ALTER TABLE "requisicao" ADD CONSTRAINT "requisicao_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area_obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicao" ADD CONSTRAINT "requisicao_requisitante_id_fkey" FOREIGN KEY ("requisitante_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicao_item" ADD CONSTRAINT "requisicao_item_requisicao_id_fkey" FOREIGN KEY ("requisicao_id") REFERENCES "requisicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicao_item" ADD CONSTRAINT "requisicao_item_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisicao_item" ADD CONSTRAINT "requisicao_item_ferramenta_id_fkey" FOREIGN KEY ("ferramenta_id") REFERENCES "ferramenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
