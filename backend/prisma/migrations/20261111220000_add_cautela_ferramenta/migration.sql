-- CreateTable
CREATE TABLE "cautela_ferramenta" (
    "id" UUID NOT NULL,
    "ferramenta_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "area_id" UUID,
    "entregue_por_id" UUID NOT NULL,
    "testado_na_saida" BOOLEAN NOT NULL DEFAULT true,
    "observacao_saida" VARCHAR(255),
    "previsao_devolucao" TIMESTAMP(3),
    "retirada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devolvida_em" TIMESTAMP(3),
    "recebido_por_id" UUID,
    "testado_no_retorno" BOOLEAN,
    "com_defeito" BOOLEAN,
    "observacao_devolucao" VARCHAR(255),

    CONSTRAINT "cautela_ferramenta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cautela_ferramenta" ADD CONSTRAINT "cautela_ferramenta_ferramenta_id_fkey" FOREIGN KEY ("ferramenta_id") REFERENCES "ferramenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautela_ferramenta" ADD CONSTRAINT "cautela_ferramenta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautela_ferramenta" ADD CONSTRAINT "cautela_ferramenta_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area_obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautela_ferramenta" ADD CONSTRAINT "cautela_ferramenta_entregue_por_id_fkey" FOREIGN KEY ("entregue_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautela_ferramenta" ADD CONSTRAINT "cautela_ferramenta_recebido_por_id_fkey" FOREIGN KEY ("recebido_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
