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

  // Calculo de indicadores operacionais e executivos
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

  return (
    <div
      style={{
        padding: '32px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Cabecalho */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '24px',
          marginBottom: '24px',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#0369a1',
              marginBottom: '8px',
            }}
          >
            Painel Operacional e Executivo
          </span>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '2rem', fontWeight: 600 }}>
            Obras Jooy - Almoxarifado
          </h1>
          <p style={{ color: '#475569', margin: '8px 0 0', fontSize: '1rem', fontWeight: 400 }}>
            Sistema de Gestao e Estoque para Canteiros de Obras
          </p>
        </div>

        {/* Status compacto no topo */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '44px',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '999px',
            backgroundColor: isError ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: isError ? '#991b1b' : '#166534',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isError ? '#b91c1c' : '#15803d',
              display: 'inline-block',
            }}
          />
          {isLoading
            ? 'Sincronizando API...'
            : isError
              ? 'API Indisponivel'
              : `Servidor Online (${data?.status || 'UP'})`}
        </div>
      </header>

      {/* Bloco de Identificacao do Usuario e Atalhos Rapidos por Perfil */}
      {usuario && (
        <section
          style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 8px' }}>
              Bem-vindo(a), {usuario.nome}!
            </h2>
            <p style={{ color: '#475569', fontSize: '0.875rem', fontWeight: 400, margin: 0 }}>
              Cargo: <strong>{usuario.cargo}</strong> • Perfil: <strong>{usuario.perfil}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              to="/requisicoes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '48px',
                backgroundColor: '#0369a1',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {usuario.perfil === 'ENCARREGADO'
                ? 'Minhas Requisicoes / Novo Pedido'
                : 'Atender Requisicoes de Obra'}
            </Link>

            {podeVerEstoque && (
              <Link
                to="/estoque"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Saldos e Movimentacoes
              </Link>
            )}

            <Link
              to="/ferramentas"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '48px',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Controle de Ferramentas
            </Link>

            {podeVerOrcamento && (
              <Link
                to="/orcamento-obra"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  backgroundColor: '#fffbeb',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Orcamento vs Consumido
              </Link>
            )}

            {usuario.perfil === 'ADMIN' && (
              <Link
                to="/usuarios"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Gerenciar Usuarios e Cargos
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Faixa de KPIs Operacionais e Executivos (Visivel quando logado) */}
      {usuario && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {/* Card 1: Requisicoes Pendentes */}
            <div
              style={{
                backgroundColor: requisicoesPendentes.length > 0 ? '#fffbeb' : '#ffffff',
                border: `1px solid ${requisicoesPendentes.length > 0 ? '#fde68a' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: requisicoesPendentes.length > 0 ? '#92400e' : '#475569',
                }}
              >
                Requisicoes Pendentes
              </span>
              <strong
                style={{
                  display: 'block',
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: requisicoesPendentes.length > 0 ? '#92400e' : '#0f172a',
                  marginTop: '8px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {requisicoesPendentes.length}
              </strong>
              <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#475569' }}>
                Aguardando separacao e entrega no almoxarifado
              </span>
            </div>

            {/* Card 2: Exportacao SIENGE */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#0369a1',
                }}
              >
                Pendentes Exportacao SIENGE
              </span>
              <strong
                style={{
                  display: 'block',
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginTop: '8px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pendentesExportacaoSienge.length}
              </strong>
              <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#475569' }}>
                {requisicoesAtendidas.length} requisicao(oes) atendida(s) no total
              </span>
            </div>

            {/* Card 3: Ferramentas e Ativos */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#475569',
                }}
              >
                Ferramentas em Campo
              </span>
              <strong
                style={{
                  display: 'block',
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginTop: '8px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {ferramentasEmprestadas.length}
              </strong>
              <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#475569' }}>
                {ferramentasDisponiveis.length} disponiveis • {ferramentasComDefeito.length} em
                manutencao
              </span>
            </div>

            {/* Card 4: Obras Ativas e Alertas de Orcamento */}
            <div
              style={{
                backgroundColor: itensComEstouroOrcamento.length > 0 ? '#fef2f2' : '#ffffff',
                border: `1px solid ${itensComEstouroOrcamento.length > 0 ? '#fecaca' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: itensComEstouroOrcamento.length > 0 ? '#991b1b' : '#166534',
                }}
              >
                Controle de Orcamento ({totalObrasAtivas} Obra(s))
              </span>
              <strong
                style={{
                  display: 'block',
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: itensComEstouroOrcamento.length > 0 ? '#991b1b' : '#166534',
                  marginTop: '8px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {itensComEstouroOrcamento.length}
              </strong>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 400,
                  color: itensComEstouroOrcamento.length > 0 ? '#991b1b' : '#475569',
                }}
              >
                {itensComEstouroOrcamento.length > 0
                  ? `${itensComEstouroOrcamento.length} item(ns) com estouro de orcamento`
                  : `${limitesOrcamento.length} limite(s) monitorado(s) dentro da meta`}
              </span>
            </div>
          </div>

          {/* Grid Principal de 2 Colunas: Fila de Requisicoes Pendentes + Ferramentas em Uso/Manutencao */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '24px',
              marginBottom: '24px',
            }}
          >
            {/* Coluna 1: Requisicoes Aguardando Atendimento */}
            <section
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                    Fila de Requisicoes Pendentes
                  </h3>
                  <Link
                    to="/requisicoes"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '44px',
                      padding: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0369a1',
                      textDecoration: 'none',
                    }}
                  >
                    Ver todas
                  </Link>
                </div>

                {requisicoesPendentes.length === 0 ? (
                  <p
                    style={{
                      margin: '24px 0',
                      color: '#475569',
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      textAlign: 'center',
                    }}
                  >
                    Nenhuma requisicao pendente de atendimento no momento.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {requisicoesPendentes.slice(0, 4).map((req) => (
                      <div
                        key={req.id}
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.875rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}
                        >
                          <strong style={{ color: '#0f172a', fontWeight: 600 }}>
                            #{req.numeroSequencial}
                          </strong>
                          <span
                            style={{
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '8px',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            Aguardando Entrega
                          </span>
                        </div>
                        <div style={{ color: '#334155', fontWeight: 400 }}>
                          {req.area?.obra?.codigo} - {req.area?.nome} • Solicitante:{' '}
                          <strong style={{ fontWeight: 600 }}>{req.requisitante?.nome}</strong>
                        </div>
                        <div
                          style={{
                            color: '#475569',
                            fontSize: '0.875rem',
                            fontWeight: 400,
                            marginTop: '8px',
                          }}
                        >
                          {req.itens.length} item(ns) solicitado(s)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Coluna 2: Rastreamento de Ferramentas (Emprestadas e em Manutencao) */}
            <section
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                    Ferramentas Emprestadas e em Manutencao
                  </h3>
                  <Link
                    to="/ferramentas"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '44px',
                      padding: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0369a1',
                      textDecoration: 'none',
                    }}
                  >
                    Gerenciar ativos
                  </Link>
                </div>

                {ferramentasEmprestadas.length === 0 && ferramentasComDefeito.length === 0 ? (
                  <p
                    style={{
                      margin: '24px 0',
                      color: '#475569',
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      textAlign: 'center',
                    }}
                  >
                    Todas as ferramentas ativas estao disponiveis no almoxarifado.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[...ferramentasEmprestadas, ...ferramentasComDefeito]
                      .slice(0, 4)
                      .map((fer) => (
                        <div
                          key={fer.id}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.875rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              <span style={{ fontFamily: 'monospace', marginRight: '8px' }}>
                                {fer.codigo}
                              </span>
                              {fer.nome}
                            </div>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 400,
                                color: '#475569',
                                marginTop: '8px',
                              }}
                            >
                              {fer.status === 'EMPRESTADO' && fer.emprestadoPara
                                ? `Responsavel: ${fer.emprestadoPara.nome} (@${fer.emprestadoPara.login})`
                                : 'Equipamento bloqueado aguardando reparo'}
                            </div>
                          </div>

                          <span
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              backgroundColor:
                                fer.status === 'EMPRESTADO' ? '#fef3c7' : '#fee2e2',
                              color: fer.status === 'EMPRESTADO' ? '#92400e' : '#991b1b',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {fer.status === 'EMPRESTADO' ? 'Emprestado' : 'Com Defeito'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* Rodape Tecnico: Status de Integracao com a API */}
      <section
        style={{
          background: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#334155',
            marginTop: 0,
            marginBottom: '16px',
          }}
        >
          Status de Integracao com a API
        </h2>

        {isLoading && (
          <p style={{ color: '#0369a1', fontSize: '0.875rem', margin: 0 }}>
            Verificando comunicacao com o servidor...
          </p>
        )}

        {isError && (
          <div
            style={{
              color: '#991b1b',
              background: '#fef2f2',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              fontSize: '0.875rem',
            }}
          >
            <strong>Falha na conexao com a API:</strong>{' '}
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
        )}

        {data && (
          <div
            style={{
              color: '#166534',
              background: '#f0fdf4',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              alignItems: 'center',
              fontSize: '0.875rem',
            }}
          >
            <p style={{ margin: 0 }}>
              <strong>Status do Back-end:</strong> {data.status}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Servico:</strong> {data.servico}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Versao:</strong> {data.versao}
            </p>
            <p style={{ margin: 0, color: '#166534' }}>
              <strong>Sincronizado em:</strong> {new Date(data.timestamp).toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
export default HomePage
