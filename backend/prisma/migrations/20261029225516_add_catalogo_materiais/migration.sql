-- CreateEnum
CREATE TYPE "TipoControleMaterial" AS ENUM ('CONSUMO', 'FERRAMENTA_PATRIMONIO');

-- CreateTable
CREATE TABLE "unidade_medida" (
    "id" UUID NOT NULL,
    "sigla" VARCHAR(10) NOT NULL,
    "descricao" VARCHAR(60) NOT NULL,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidade_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_material" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categoria_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "descricao" VARCHAR(180) NOT NULL,
    "categoria_id" UUID NOT NULL,
    "tipo_controle" "TipoControleMaterial" NOT NULL DEFAULT 'CONSUMO',
    "unidade_compra_id" UUID NOT NULL,
    "unidade_consumo_id" UUID NOT NULL,
    "fator_conversao" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "eh_kit" BOOLEAN NOT NULL DEFAULT false,
    "exige_teste_qualidade" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidade_medida_sigla_key" ON "unidade_medida"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_material_nome_key" ON "categoria_material"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "material_codigo_key" ON "material"("codigo");

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_unidade_compra_id_fkey" FOREIGN KEY ("unidade_compra_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_unidade_consumo_id_fkey" FOREIGN KEY ("unidade_consumo_id") REFERENCES "unidade_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
