-- CreateEnum
CREATE TYPE "StatusFerramenta" AS ENUM ('DISPONIVEL', 'EMPRESTADO', 'COM_DEFEITO');

-- AlterTable
ALTER TABLE "material" DROP COLUMN "tipo_controle";
ALTER TABLE "material" ALTER COLUMN "unidade_compra_id" DROP NOT NULL;

-- DropEnum
DROP TYPE "TipoControleMaterial";

-- CreateTable
CREATE TABLE "ferramenta" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "status" "StatusFerramenta" NOT NULL DEFAULT 'DISPONIVEL',
    "emprestado_para_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ferramenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ferramenta_codigo_key" ON "ferramenta"("codigo");

-- AddForeignKey
ALTER TABLE "ferramenta" ADD CONSTRAINT "ferramenta_emprestado_para_id_fkey" FOREIGN KEY ("emprestado_para_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
