-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMIN', 'ALMOXARIFE', 'ENGENHARIA', 'ADMINISTRACAO', 'ENCARREGADO');

-- CreateTable
CREATE TABLE "cargo" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "login" VARCHAR(60) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "cargo_id" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check" (
    "id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cargo_nome_key" ON "cargo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_login_key" ON "usuario"("login");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
