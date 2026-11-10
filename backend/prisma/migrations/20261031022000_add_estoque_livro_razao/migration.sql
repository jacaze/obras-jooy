-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA_RECEB', 'SAIDA_REQ', 'ENTRADA_DEVOL', 'SAIDA_TRANSF', 'ENTRADA_TRANSF', 'AJUSTE_INV', 'ESTORNO');

-- CreateTable
CREATE TABLE "local_estoque" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_saldo" (
    "local_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantidade" DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    "reservado" DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_saldo_pkey" PRIMARY KEY ("local_id","material_id")
);

-- CreateTable
CREATE TABLE "movimentacao_estoque" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" DECIMAL(12,4) NOT NULL,
    "area_id" UUID,
    "requisicao_id" UUID,
    "usuario_id" UUID NOT NULL,
    "estorno_de_id" UUID,
    "chave_idempotencia" VARCHAR(100),
    "observacao" VARCHAR(255),
    "ocorrida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "local_estoque_obra_nome_unico" ON "local_estoque"("obra_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "movimentacao_estoque_chave_idempotencia_key" ON "movimentacao_estoque"("chave_idempotencia");

-- AddForeignKey
ALTER TABLE "local_estoque" ADD CONSTRAINT "local_estoque_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_saldo" ADD CONSTRAINT "estoque_saldo_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "local_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_saldo" ADD CONSTRAINT "estoque_saldo_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "local_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area_obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_requisicao_id_fkey" FOREIGN KEY ("requisicao_id") REFERENCES "requisicao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
