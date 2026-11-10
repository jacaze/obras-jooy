import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  fetchHealth,
  getObras,
  getRequisicoes,
  getFerramentas,
  getLimitesOrcamentoObra,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { FEATURE_ORCAMENTO_ATIVO } from '../config/features'

export function HomePage() {
  const { usuario } = useAuth()
  const isEncarregado = usuario?.perfil === 'ENCARREGADO'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  const { data: obras = [] } = useQuery({
    queryKey: ['dashboard-obras'],
    queryFn: () => getObras(true),
    enabled: Boolean(usuario),
  })

  const { data: requisicoes = [] } = useQuery({
    queryKey: ['dashboard-requisicoes'],
    queryFn: () => getRequisicoes(),
    enabled: Boolean(usuario),
  })

  const { data: ferramentas = [] } = useQuery({
    queryKey: ['dashboard-ferramentas'],
    queryFn: () => getFerramentas({ somenteAtivas: true }),
    enabled: Boolean(usuario) && !isEncarregado,
  })

  const { data: limitesOrcamento = [] } = useQuery({
    queryKey: ['dashboard-limites-orcamento'],
    queryFn: () => getLimitesOrcamentoObra(),
    enabled: Boolean(usuario) && !isEncarregado && FEATURE_ORCAMENTO_ATIVO,
  })

  // Indicadores Operacionais Gerais (Almoxarifado / Engenharia / Administracao)
  const totalObrasAtivas = obras.length
  const requisicoesPendentes = requisicoes.filter((r) => r.status === 'SOLICITADA')
  const requisicoesAtendidas = requisicoes.filter((r) => r.status === 'ATENDIDA')
  const pendentesExportacaoSienge = requisicoesAtendidas.filter((r) => !r.exportadaSienge)

  const ferramentasEmprestadas = ferramentas.filter((f) => f.status === 'EMPRESTADO')
  const ferramentasComDefeito = ferramentas.filter((f) => f.status === 'COM_DEFEITO')
  const ferramentasDisponiveis = ferramentas.filter((f) => f.status === 'DISPONIVEL')

  const itensComEstouroOrcamento = limitesOrcamento.filter((lim) => {
    const consumido = lim.quantidadeConsumida !== undefined ? Number(lim.quantidadeConsumida) : 0
    return consumido > Number(lim.quantidadeOrcada)
  })

  // Indicadores Exclusivos do Encarregado (Canteiro de Obras)
  const minhasRequisicoes = requisicoes.filter(
    (r) =>
      r.requisitanteId === usuario?.id ||
      r.requisitante?.id === usuario?.id ||
      r.requisitante?.login === usuario?.login
  )
  const minhasPendentes = minhasRequisicoes.filter(
    (r) => r.status === 'SOLICITADA' || r.status === 'EM_SEPARACAO' || r.status === 'PRONTA'
  )
  const minhasAtendidas = minhasRequisicoes.filter((r) => r.status === 'ATENDIDA')
  const minhasCanceladas = minhasRequisicoes.filter((r) => r.status === 'CANCELADA')

  const podeVerOrcamento =
    FEATURE_ORCAMENTO_ATIVO &&
    (usuario?.perfil === 'ADMIN' ||
      usuario?.perfil === 'ENGENHARIA' ||
      usuario?.perfil === 'ADMINISTRACAO')

  const podeVerEstoque =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ALMOXARIFE' ||
    usuario?.perfil === 'ENGENHARIA' ||
    usuario?.perfil === 'ADMINISTRACAO'

  const podeVerFerramentas = usuario?.perfil !== 'ENCARREGADO'
  const podeVerObras = usuario?.perfil !== 'ENCARREGADO'

  const obraPrincipalNome = obras.length > 0 ? obras[0].nome : 'Residencial Jooy Ilhas'

  return (
    <main className="flex flex-col w-full min-h-screen bg-surface pb-28">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex flex-col gap-6">
        {/* Top Title Banner with System Status Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-primary">
              {isEncarregado ? 'Canteiro de Obras' : 'Painel Operacional e Executivo'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-0.5">
              {isEncarregado ? 'Obras Jooy - Canteiro' : 'Obras Jooy - Almoxarifado'}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {isEncarregado
                ? 'Solicitação de materiais e acompanhamento de pedidos para sua equipe'
                : 'Gestão de insumos, ferramentas e controle orçamentário de canteiro'}
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-sm text-xs font-semibold ${
              isError
                ? 'bg-error-container text-on-error-container border border-error/20'
                : 'bg-secondary-container text-on-secondary-container'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isError ? 'bg-error' : 'bg-secondary animate-pulse'
              }`}
            />
            <span>
              {isLoading
                ? 'Sincronizando API...'
                : isError
                  ? 'API Indisponível'
                  : `Servidor Online (${data?.status || 'UP'})`}
            </span>
          </div>
        </div>

        {/* User Profile Quick Actions Inset Card (Stitch Inset Card) */}
        {usuario && (
          <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container transition-all hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-lg shadow-inner flex-shrink-0">
                  {usuario.nome.charAt(0).toUpperCase()}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full ring-2 ring-surface-container-lowest" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base sm:text-lg font-bold text-on-surface truncate">
                      Bem-vindo(a), {usuario.nome}!
                    </h2>
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      verified
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-on-surface-variant truncate">
                    Cargo: <strong className="text-on-surface">{usuario.cargo}</strong> • Perfil:{' '}
                    <strong className="text-primary">{usuario.perfil}</strong>
                  </p>
                  <div className="inline-flex items-center gap-1 mt-0.5 text-xs text-on-surface-variant truncate">
                    <span className="material-symbols-outlined text-[14px]">apartment</span>
                    <span>{obraPrincipalNome}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Link
                  to="/requisicoes"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold shadow-sm hover:bg-primary-container active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isEncarregado ? 'add_circle' : 'assignment'}
                  </span>
                  {isEncarregado ? 'Novo Pedido de Obra' : 'Atender Requisições de Obra'}
                </Link>

                {isEncarregado && (
                  <Link
                    to="/requisicoes"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs sm:text-sm font-semibold shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    Minhas Requisições
                  </Link>
                )}

                {podeVerEstoque && (
                  <Link
                    to="/estoque"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs sm:text-sm font-semibold shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    Saldos e Movimentações
                  </Link>
                )}

                {podeVerFerramentas && (
                  <Link
                    to="/ferramentas"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs sm:text-sm font-semibold shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">construction</span>
                    Controle de Ferramentas
                  </Link>
                )}

                {podeVerOrcamento && (
                  <Link
                    to="/orcamento"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs sm:text-sm font-semibold shadow-sm hover:bg-tertiary-container hover:text-on-tertiary-container active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">query_stats</span>
                    Orçamento vs Consumido
                  </Link>
                )}

                {usuario.perfil === 'ADMIN' && (
                  <Link
                    to="/usuarios"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-variant text-on-surface text-xs sm:text-sm font-semibold shadow-sm hover:bg-surface-container-highest active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    Gerenciar Usuários e Cargos
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 2x2 KPI Executive Grid para Almoxarifado / Engenharia / Administracao */}
        {usuario && !isEncarregado && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Métricas de Turno & Operação
              </span>
              <span className="text-xs text-primary font-semibold">Hoje • Tempo Real</span>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                FEATURE_ORCAMENTO_ATIVO ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
              } gap-3`}
            >
              {/* Card 1: Requisições Pendentes */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between">
                  <span className="w-9 h-9 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">pending_actions</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      requisicoesPendentes.length > 0
                        ? 'bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {requisicoesPendentes.length > 0
                      ? `${requisicoesPendentes.length} no balcão`
                      : 'Zerado'}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-on-surface leading-none tracking-tight">
                    {requisicoesPendentes.length}
                  </span>
                  <p className="text-xs font-semibold text-on-surface mt-1">
                    Requisições Pendentes
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Aguardando separação e entrega no almoxarifado
                  </p>
                </div>
              </div>

              {/* Card 2: Exportação SIENGE */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between">
                  <span className="w-9 h-9 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-fixed-dim/40 text-on-primary-fixed-variant text-[11px] font-bold">
                    Sync ERP
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-on-surface leading-none tracking-tight">
                    {pendentesExportacaoSienge.length}
                  </span>
                  <p className="text-xs font-semibold text-on-surface mt-1">
                    Pendentes Exportação SIENGE
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {requisicoesAtendidas.length} requisição(ões) atendida(s) no total
                  </p>
                </div>
              </div>

              {/* Card 3: Ferramentas em Campo */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between">
                  <span className="w-9 h-9 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">handyman</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[11px] font-bold">
                    {ferramentasComDefeito.length} em reparo
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-on-surface leading-none tracking-tight">
                    {ferramentasEmprestadas.length}
                  </span>
                  <p className="text-xs font-semibold text-on-surface mt-1">
                    Ferramentas em Campo
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {ferramentasDisponiveis.length} disponíveis no almoxarifado
                  </p>
                </div>
              </div>

              {/* Card 4: Controle de Orçamento (Isolado via Feature Flag) */}
              {FEATURE_ORCAMENTO_ATIVO && (
                <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                        itensComEstouroOrcamento.length > 0
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-secondary-fixed text-on-secondary-fixed'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">query_stats</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        itensComEstouroOrcamento.length > 0
                          ? 'bg-error-container text-on-error-container animate-pulse'
                          : 'bg-secondary-container text-on-secondary-container'
                      }`}
                    >
                      {itensComEstouroOrcamento.length > 0 ? 'Alerta Crítico' : 'No Limite'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <span
                      className={`text-3xl font-bold leading-none tracking-tight ${
                        itensComEstouroOrcamento.length > 0 ? 'text-error' : 'text-secondary'
                      }`}
                    >
                      {itensComEstouroOrcamento.length}
                    </span>
                    <p className="text-xs font-semibold text-on-surface mt-1">
                      Controle de Orçamento ({totalObrasAtivas} Obra(s))
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {itensComEstouroOrcamento.length > 0
                        ? `${itensComEstouroOrcamento.length} item(ns) com estouro de orçamento`
                        : `${limitesOrcamento.length} limites monitorados dentro da meta`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Resumo de Pedidos para o ENCARREGADO (Canteiro de Obras) */}
        {usuario && isEncarregado && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Resumo dos Meus Pedidos
              </span>
              <span className="text-xs text-primary font-semibold">Canteiro • Tempo Real</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Aguardando Separação */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between">
                  <span className="w-9 h-9 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">pending_actions</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      minhasPendentes.length > 0
                        ? 'bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {minhasPendentes.length > 0
                      ? `${minhasPendentes.length} pendente(s)`
                      : 'Sem pendências'}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-on-surface leading-none tracking-tight">
                    {minhasPendentes.length}
                  </span>
                  <p className="text-xs font-semibold text-on-surface mt-1">
                    Aguardando Almoxarifado
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Pedidos em separação ou aguardando entrega no balcão
                  </p>
                </div>
              </div>

              {/* Card 2: Entregues / Atendidas */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between">
                  <span className="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold">
                    Entregue
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-on-surface leading-none tracking-tight">
                    {minhasAtendidas.length}
                  </span>
                  <p className="text-xs font-semibold text-on-surface mt-1">
                    Pedidos Atendidos
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Materiais e ferramentas recebidos na obra
                  </p>
                </div>
              </div>

              {/* Card 3: Total Solicitado */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between">
                  <span className="w-9 h-9 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">assignment</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-fixed-dim/40 text-on-primary-fixed-variant text-[11px] font-bold">
                    Histórico
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-on-surface leading-none tracking-tight">
                    {minhasRequisicoes.length}
                  </span>
                  <p className="text-xs font-semibold text-on-surface mt-1">
                    Total de Pedidos
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {minhasCanceladas.length > 0
                      ? `${minhasCanceladas.length} pedido(s) cancelado(s)`
                      : 'Requisições abertas por você nesta obra'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Fila de Requisições e Ferramentas para Almoxarifado / Engenharia / Administracao */}
        {usuario && !isEncarregado && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Coluna 1: Fila de Requisições Pendentes */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                  Fila de Requisições Pendentes
                </span>
                <Link
                  to="/requisicoes"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver todas
                </Link>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container divide-y divide-surface-container overflow-hidden">
                {requisicoesPendentes.length === 0 ? (
                  <div className="p-6 text-center text-sm text-on-surface-variant">
                    Nenhuma requisição pendente de atendimento no momento.
                  </div>
                ) : (
                  requisicoesPendentes.slice(0, 4).map((req) => (
                    <div
                      key={req.id}
                      className="p-4 flex flex-col gap-2 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-primary">
                            #{req.numeroSequencial}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                          <span className="text-xs font-semibold text-on-surface truncate">
                            {req.area?.obra?.codigo} - {req.area?.nome}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold">
                          Aguardando Entrega
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-on-surface-variant">
                            Solicitante:{' '}
                            <strong className="text-on-surface font-semibold">
                              {req.requisitante?.nome}
                            </strong>
                          </div>
                          <div className="text-[11px] text-on-surface-variant mt-0.5">
                            {req.itens.length} item(ns) solicitado(s)
                          </div>
                        </div>

                        <Link
                          to="/requisicoes"
                          className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-sm hover:bg-primary-container active:scale-95 transition-all"
                        >
                          Atender
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Coluna 2: Ferramentas em Uso e Manutenção */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                  Ferramentas Emprestadas e em Manutenção
                </span>
                <Link
                  to="/ferramentas"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Gerenciar ativos
                </Link>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container divide-y divide-surface-container overflow-hidden">
                {ferramentasEmprestadas.length === 0 && ferramentasComDefeito.length === 0 ? (
                  <div className="p-6 text-center text-sm text-on-surface-variant">
                    Todas as ferramentas ativas estão disponíveis no almoxarifado.
                  </div>
                ) : (
                  [...ferramentasEmprestadas, ...ferramentasComDefeito].slice(0, 4).map((fer) => (
                    <div
                      key={fer.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            fer.status === 'EMPRESTADO'
                              ? 'bg-surface-container-high text-on-surface'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {fer.status === 'EMPRESTADO' ? 'construction' : 'build_circle'}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-primary">
                              {fer.codigo}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-outline-variant" />
                            <span className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                              {fer.nome}
                            </span>
                          </div>
                          <div className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                            {fer.status === 'EMPRESTADO' && fer.emprestadoPara
                              ? `Responsável: ${fer.emprestadoPara.nome}`
                              : 'Equipamento bloqueado aguardando reparo'}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${
                          fer.status === 'EMPRESTADO'
                            ? 'bg-secondary-fixed text-on-secondary-fixed'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {fer.status === 'EMPRESTADO' ? 'Emprestado' : 'Com Defeito'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* Seção de Pedidos Recentes do Encarregado */}
        {usuario && isEncarregado && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Meus Pedidos Recentes de Obra
              </span>
              <Link
                to="/requisicoes"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Ver todos
              </Link>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container divide-y divide-surface-container overflow-hidden">
              {minhasRequisicoes.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                    assignment_late
                  </span>
                  <p className="text-sm font-semibold text-on-surface">
                    Você ainda não fez nenhum pedido de material ou ferramenta.
                  </p>
                  <p className="text-xs text-on-surface-variant max-w-sm">
                    Clique no botão abaixo para abrir uma nova requisição para a área ou pavimento onde você está trabalhando.
                  </p>
                  <Link
                    to="/requisicoes"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-sm hover:bg-primary-container transition-all mt-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Fazer Novo Pedido
                  </Link>
                </div>
              ) : (
                minhasRequisicoes.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">
                          #{req.numeroSequencial}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                        <span className="text-xs font-semibold text-on-surface truncate">
                          {req.area?.obra?.codigo} - {req.area?.nome}
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {req.itens.length} item(ns) solicitado(s)
                        {req.itens[0]?.material && ` • ${req.itens[0].material.descricao}`}
                        {req.itens[0]?.ferramenta && ` • ${req.itens[0].ferramenta.nome}`}
                        {req.itens.length > 1 && ` (+${req.itens.length - 1} outro(s))`}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          req.status === 'SOLICITADA' || req.status === 'EM_SEPARACAO'
                            ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                            : req.status === 'PRONTA'
                              ? 'bg-primary-fixed text-on-primary-fixed'
                              : req.status === 'ATENDIDA'
                                ? 'bg-secondary-container text-on-secondary-container'
                                : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {req.status === 'SOLICITADA'
                          ? 'Aguardando Almoxarifado'
                          : req.status === 'EM_SEPARACAO'
                            ? 'Em Separação'
                            : req.status === 'PRONTA'
                              ? 'Pronta para Retirada'
                              : req.status === 'ATENDIDA'
                                ? 'Entregue no Canteiro'
                                : 'Cancelada'}
                      </span>

                      <Link
                        to="/requisicoes"
                        className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shadow-sm transition-all"
                      >
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Status Canteiro Visual Highlight Card */}
        <div className="relative rounded-2xl overflow-hidden shadow-sm p-4 sm:p-5 bg-surface-container-high text-on-surface border border-surface-container">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 w-full">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent-text">
                Status do Canteiro Jooy
              </p>
              <p className="text-sm sm:text-base font-bold text-on-surface">
                {obraPrincipalNome} • Estrutura & Alvenaria em Execução
              </p>
            </div>
            {podeVerObras && (
              <Link
                to="/obras"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs font-semibold border border-surface-container transition-all"
              >
                <span>Ver Torres</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default HomePage
