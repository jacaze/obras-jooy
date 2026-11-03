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

export function HomePage() {
  const { usuario } = useAuth()

  const { data, isLoading, isError, error } = useQuery({
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
    enabled: Boolean(usuario),
  })

  const { data: limitesOrcamento = [] } = useQuery({
    queryKey: ['dashboard-limites-orcamento'],
    queryFn: () => getLimitesOrcamentoObra(),
    enabled: Boolean(usuario),
  })

  // Indicadores Operacionais
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

  const podeVerOrcamento =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ENGENHARIA' ||
    usuario?.perfil === 'ADMINISTRACAO'

  const podeVerEstoque =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ALMOXARIFE' ||
    usuario?.perfil === 'ENGENHARIA' ||
    usuario?.perfil === 'ADMINISTRACAO'

  const obraPrincipalNome = obras.length > 0 ? obras[0].nome : 'Residencial Jooy Ilhas'

  return (
    <main className="flex flex-col w-full min-h-screen bg-surface pb-28">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex flex-col gap-6">
        {/* Top Title Banner with System Status Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-primary">
              Painel Operacional e Executivo
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-0.5">
              Obras Jooy - Almoxarifado
            </h1>
            <p className="text-sm text-on-surface-variant">
              Gestão de insumos, ferramentas e controle orçamentário de canteiro
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
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  {usuario.perfil === 'ENCARREGADO'
                    ? 'Minhas Requisicoes / Novo Pedido'
                    : 'Atender Requisicoes de Obra'}
                </Link>

                {podeVerEstoque && (
                  <Link
                    to="/estoque"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs sm:text-sm font-semibold shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    Saldos e Movimentacoes
                  </Link>
                )}

                <Link
                  to="/ferramentas"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs sm:text-sm font-semibold shadow-sm active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">construction</span>
                  Controle de Ferramentas
                </Link>

                {podeVerOrcamento && (
                  <Link
                    to="/orcamento"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs sm:text-sm font-semibold shadow-sm hover:bg-tertiary-container hover:text-on-tertiary-container active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">query_stats</span>
                    Orcamento vs Consumido
                  </Link>
                )}

                {usuario.perfil === 'ADMIN' && (
                  <Link
                    to="/usuarios"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-variant text-on-surface text-xs sm:text-sm font-semibold shadow-sm hover:bg-surface-container-highest active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    Gerenciar Usuarios e Cargos
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 2x2 KPI Executive Grid (Stitch Styled) */}
        {usuario && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                Métricas de Turno & Operação
              </span>
              <span className="text-xs text-primary font-semibold">Hoje • Tempo Real</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                    Requisicoes Pendentes
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Aguardando separacao e entrega no almoxarifado
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
                    Pendentes Exportacao SIENGE
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {requisicoesAtendidas.length} requisicao(oes) atendida(s) no total
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

              {/* Card 4: Controle de Orçamento */}
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
                    Controle de Orcamento ({totalObrasAtivas} Obra(s))
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {itensComEstouroOrcamento.length > 0
                      ? `${itensComEstouroOrcamento.length} item(ns) com estouro de orcamento`
                      : `${limitesOrcamento.length} limites monitorados dentro da meta`}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Inset Grouped Section: Fila de Requisições e Ferramentas */}
        {usuario && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Coluna 1: Fila de Requisições Pendentes */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
                  Fila de Requisicoes Pendentes
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
                    Nenhuma requisicao pendente de atendimento no momento.
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
                  Ferramentas Emprestadas e em Manutencao
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
                    Todas as ferramentas ativas estao disponiveis no almoxarifado.
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

        {/* Status Canteiro Visual Highlight Card (Stitch Inspired) */}
        <div className="relative rounded-2xl overflow-hidden shadow-sm h-28 sm:h-32 flex items-end p-4 bg-gradient-to-r from-on-surface via-inverse-surface to-on-surface text-inverse-on-surface border border-surface-container">
          <div className="relative z-10 flex items-center justify-between w-full">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-fixed">
                Status do Canteiro Jooy
              </p>
              <p className="text-sm sm:text-base font-bold text-white">
                {obraPrincipalNome} • Estrutura & Alvenaria em Execução
              </p>
            </div>
            <Link
              to="/obras"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md hover:bg-white/25 text-white text-xs font-semibold transition-all"
            >
              <span>Ver Torres</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>
        </div>

        {/* Rodapé Técnico: Status de Integração com a API */}
        <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container">
          <h2 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">dns</span>
            Status de Integracao com a API
          </h2>

          {isLoading && (
            <p className="text-xs text-primary">Verificando comunicacao com o servidor...</p>
          )}

          {isError && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs border border-error/20">
              <strong>Falha na conexao com a API:</strong>{' '}
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </div>
          )}

          {data && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant bg-surface-container-low p-3.5 rounded-xl">
              <p className="m-0">
                <strong className="text-on-surface">Status do Back-end:</strong> {data.status}
              </p>
              <p className="m-0">
                <strong className="text-on-surface">Servico:</strong> {data.servico}
              </p>
              <p className="m-0">
                <strong className="text-on-surface">Versao:</strong> {data.versao}
              </p>
              <p className="m-0 text-secondary">
                <strong className="text-on-surface">Sincronizado em:</strong>{' '}
                {new Date(data.timestamp).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
export default HomePage
