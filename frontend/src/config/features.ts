/**
 * Feature Flags da Aplicacao Obras Jooy
 *
 * Permite isolar funcionalidades sob demanda sem necessidade de remover codigo.
 * Controladas via variaveis de ambiente de build do Vite (prefixo VITE_).
 */

// Modulo de Orcamento de Obra (desativado por padrao a pedido do cliente)
export const FEATURE_ORCAMENTO_ATIVO: boolean =
  import.meta.env.VITE_FEATURE_ORCAMENTO === 'true'

// Botoes de Acesso Rapido para Teste do MVP na tela de Login (desativado por padrao em producao)
export const EXIBIR_ACESSO_RAPIDO_TESTE: boolean =
  import.meta.env.VITE_EXIBIR_ACESSO_RAPIDO_TESTE === 'true'
