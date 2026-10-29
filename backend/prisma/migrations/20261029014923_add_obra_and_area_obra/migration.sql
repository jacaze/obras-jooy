-- CreateTable
CREATE TABLE "obra" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "cidade" VARCHAR(80) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_obra" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "area_obra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "obra_codigo_key" ON "obra"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "area_obra_obra_id_nome_key" ON "area_obra"("obra_id", "nome");

-- AddForeignKey
ALTER TABLE "area_obra" ADD CONSTRAINT "area_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
