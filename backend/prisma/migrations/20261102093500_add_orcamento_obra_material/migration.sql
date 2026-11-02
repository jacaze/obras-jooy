-- CreateTable
CREATE TABLE "orcamento_obra_material" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantidade_orcada" DECIMAL(12,4) NOT NULL,
    "observacao" VARCHAR(255),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamento_obra_material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orcamento_obra_material_obra_id_material_id_key" ON "orcamento_obra_material"("obra_id", "material_id");

-- AddForeignKey
ALTER TABLE "orcamento_obra_material" ADD CONSTRAINT "orcamento_obra_material_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_obra_material" ADD CONSTRAINT "orcamento_obra_material_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
