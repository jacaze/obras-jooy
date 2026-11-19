-- Limpeza unica de producao: remove itens de estoque, movimentacoes, requisicoes e materiais demo antigos
DELETE FROM "requisicao_item";
DELETE FROM "movimentacao_estoque";
DELETE FROM "requisicao";
DELETE FROM "estoque_saldo";
DELETE FROM "orcamento_obra_material";
DELETE FROM "material";

-- Reinicia a contagem sequencial de requisicoes para comecar do #1
ALTER SEQUENCE IF EXISTS "requisicao_numero_sequencial_seq" RESTART WITH 1;
