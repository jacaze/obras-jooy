import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFerramentas,
  createFerramenta,
  updateFerramenta,
  registrarEmprestimoFerramenta,
  registrarDevolucaoFerramenta,
  getUsuariosOpcoes,
  getUsuarios,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Ferramenta, StatusFerramenta } from '../types/material'

export function FerramentasPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  // Permissoes: Admin, Engenharia e Almoxarife gerenciam
  const podeGerenciar =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ENGENHARIA' ||
    usuario?.perfil === 'ALMOXARIFE'

  // Filtros
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [somenteAtivas, setSomenteAtivas] = useState(true)

  // Mensagens
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  // Modal de Criacao e Edicao
  const [modalFerramentaAberto, setModalFerramentaAberto] = useState(false)
  const [ferramentaEmEdicao, setFerramentaEmEdicao] = useState<Ferramenta | null>(null)
  const [formCodigo, setFormCodigo] = useState('')
  const [formNome, setFormNome] = useState('')

  // Modal de Emprestimo
  const [ferramentaParaEmprestimo, setFerramentaParaEmprestimo] = useState<Ferramenta | null>(null)
  const [usuarioEmprestimoId, setUsuarioEmprestimoId] = useState('')

  // Modal de Devolucao
  const [ferramentaParaDevolucao, setFerramentaParaDevolucao] = useState<Ferramenta | null>(null)
  const [devolucaoComDefeito, setDevolucaoComDefeito] = useState(false)

  // Queries
  const { data: ferramentas = [], isLoading: carregandoFerramentas } = useQuery({
    queryKey: ['ferramentas', busca, statusFiltro, somenteAtivas],
    queryFn: () =>
      getFerramentas({
        busca: busca.trim() || undefined,
        status: (statusFiltro as StatusFerramenta) || undefined,
        somenteAtivas,
      }),
  })

  const { data: usuariosOpcoes = [] } = useQuery({
    queryKey: ['usuarios-opcoes-ferramentas'],
    queryFn: async () => {
      if (typeof getUsuariosOpcoes === 'function') {
        const res = await getUsuariosOpcoes()
        if (res && res.length > 0) return res
      }
      return getUsuarios()
    },
    enabled: podeGerenciar,
  })

  const usuariosAtivos = usuariosOpcoes.filter((u) => u.ativo !== false)

  // Indicadores operacionais (KPIs)
  const totalFerramentas = ferramentas.length
  const totalDisponiveis = ferramentas.filter((f) => f.status === 'DISPONIVEL' && f.ativo).length
  const totalEmprestadas = ferramentas.filter((f) => f.status === 'EMPRESTADO').length
  const totalComDefeito = ferramentas.filter((f) => f.status === 'COM_DEFEITO').length

  // Mutations
  const salvarFerramentaMutation = useMutation({
    mutationFn: async () => {
      if (ferramentaEmEdicao) {
        return updateFerramenta(ferramentaEmEdicao.id, { nome: formNome.trim() })
      }
      return createFerramenta({
        codigo: formCodigo.trim().toUpperCase(),
        nome: formNome.trim(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setModalFerramentaAberto(false)
      setFerramentaEmEdicao(null)
      setFormCodigo('')
      setFormNome('')
      setMensagemErro(null)
      setMensagemSucesso('Ferramenta salva com sucesso no catalogo.')
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao salvar ferramenta.'
      )
    },
  })

  const emprestarFerramentaMutation = useMutation({
    mutationFn: async ({ id, usuarioId }: { id: string; usuarioId: string }) =>
      registrarEmprestimoFerramenta(id, usuarioId),
    onSuccess: (ferAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setFerramentaParaEmprestimo(null)
      setUsuarioEmprestimoId('')
      setMensagemErro(null)
      setMensagemSucesso(
        `Emprestimo registrado: ${ferAtualizada.codigo} (${ferAtualizada.nome}) entregue para ${ferAtualizada.emprestadoPara?.nome || 'usuario selecionado'}.`
      )
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao registrar emprestimo.'
      )
    },
  })

  const devolverFerramentaMutation = useMutation({
    mutationFn: async ({ id, comDefeito }: { id: string; comDefeito: boolean }) =>
      registrarDevolucaoFerramenta(id, comDefeito),
    onSuccess: (ferAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setFerramentaParaDevolucao(null)
      setDevolucaoComDefeito(false)
      setMensagemErro(null)
      setMensagemSucesso(
        ferAtualizada.status === 'COM_DEFEITO'
          ? `Devolucao registrada com avaria: ${ferAtualizada.codigo} encaminhada para manutencao.`
          : `Devolucao registrada com sucesso: ${ferAtualizada.codigo} disponivel novamente no almoxarifado.`
      )
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao registrar devolucao.'
      )
    },
  })

  const atualizarStatusFerramentaMutation = useMutation({
    mutationFn: async ({
      id,
      dados,
      mensagemOk,
    }: {
      id: string
      dados: { status?: StatusFerramenta; ativo?: boolean }
      mensagemOk: string
    }) => {
      const res = await updateFerramenta(id, dados)
      return { res, mensagemOk }
    },
    onSuccess: ({ mensagemOk }) => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setMensagemErro(null)
      setMensagemSucesso(mensagemOk)
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao atualizar ferramenta.'
      )
    },
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Cabecalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Controle de Ferramentas e Ativos
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Itens devolutivos individuais com rastreamento de emprestimo, devolucao e manutencao em obra.
          </p>
        </div>

        {podeGerenciar && (
          <button
            type="button"
            onClick={() => {
              setFerramentaEmEdicao(null)
              setFormCodigo('')
              setFormNome('')
              setMensagemErro(null)
              setModalFerramentaAberto(true)
            }}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#0284c7',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Nova Ferramenta
          </button>
        )}
      </div>

      {/* Faixa de Indicadores Operacionais (KPIs) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1rem 1.25rem',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Total Cadastradas
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#0f172a',
              marginTop: '0.25rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalFerramentas}
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Ativos catalogados no almoxarifado
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            padding: '1rem 1.25rem',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Disponiveis para Uso
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#15803d',
              marginTop: '0.25rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalDisponiveis}
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#166534' }}>
            Prontas para retirada imediata
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: '8px',
            border: '1px solid #fde68a',
            padding: '1rem 1.25rem',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#b45309',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Emprestadas em Campo
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#b45309',
              marginTop: '0.25rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalEmprestadas}
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#92400e' }}>
            Sob responsabilidade de colaboradores
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            padding: '1rem 1.25rem',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#b91c1c',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Em Manutencao / Defeito
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#b91c1c',
              marginTop: '0.25rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalComDefeito}
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#991b1b' }}>
            Bloqueadas ate conclusao de conserto
          </span>
        </div>
      </div>

      {/* Alertas */}
      {mensagemSucesso && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#166534',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{mensagemSucesso}</span>
          <button
            type="button"
            onClick={() => setMensagemSucesso(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#166534',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            X
          </button>
        </div>
      )}

      {mensagemErro && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{mensagemErro}</span>
          <button
            type="button"
            onClick={() => setMensagemErro(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#991b1b',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            X
          </button>
        </div>
      )}

      {/* Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          backgroundColor: '#f8fafc',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          alignItems: 'end',
        }}
      >
        <div>
          <label
            htmlFor="filtro-ferramenta-busca"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '0.25rem',
            }}
          >
            Buscar Ferramenta
          </label>
          <input
            id="filtro-ferramenta-busca"
            type="text"
            placeholder="Nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="filtro-ferramenta-status"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '0.25rem',
            }}
          >
            Status Operacional
          </label>
          <select
            id="filtro-ferramenta-status"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Todos os status</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="EMPRESTADO">Emprestado</option>
            <option value="COM_DEFEITO">Com Defeito</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem' }}>
          <input
            id="filtro-ferramenta-ativas"
            type="checkbox"
            checked={somenteAtivas}
            onChange={(e) => setSomenteAtivas(e.target.checked)}
            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
          />
          <label
            htmlFor="filtro-ferramenta-ativas"
            style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500, cursor: 'pointer' }}
          >
            Exibir somente ativas
          </label>
        </div>
      </div>

      {/* Tabela de Ferramentas */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Código / Identificação
                </th>
                <th
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Nome da Ferramenta
                </th>
                <th
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Emprestado Para
                </th>
                {podeGerenciar && (
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      textAlign: 'right',
                    }}
                  >
                    Ações Operacionais
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {carregandoFerramentas ? (
                <tr>
                  <td
                    colSpan={podeGerenciar ? 5 : 4}
                    style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                  >
                    Carregando ferramentas cadastradas...
                  </td>
                </tr>
              ) : ferramentas.length === 0 ? (
                <tr>
                  <td
                    colSpan={podeGerenciar ? 5 : 4}
                    style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}
                  >
                    Nenhuma ferramenta encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                ferramentas.map((fer) => {
                  return (
                    <tr
                      key={fer.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        opacity: fer.ativo ? 1 : 0.6,
                      }}
                    >
                      <td
                        style={{
                          padding: '0.875rem 1rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {fer.codigo}
                        {!fer.ativo && (
                          <span
                            style={{
                              marginLeft: '0.45rem',
                              padding: '0.1rem 0.4rem',
                              backgroundColor: '#e2e8f0',
                              color: '#475569',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontFamily: 'system-ui, sans-serif',
                            }}
                          >
                            Inativa
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '0.875rem 1rem',
                          fontWeight: 600,
                          color: '#1e293b',
                          fontSize: '0.9rem',
                        }}
                      >
                        {fer.nome}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {fer.status === 'DISPONIVEL' && (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Disponível
                          </span>
                        )}
                        {fer.status === 'EMPRESTADO' && (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Emprestado
                          </span>
                        )}
                        {fer.status === 'COM_DEFEITO' && (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Com Defeito
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>
                        {fer.status === 'EMPRESTADO' && fer.emprestadoPara ? (
                          <div>
                            <span style={{ fontWeight: 600, color: '#0369a1' }}>
                              {fer.emprestadoPara.nome}
                            </span>
                            <span
                              style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.4rem' }}
                            >
                              (@{fer.emprestadoPara.login})
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      {podeGerenciar && (
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              gap: '0.45rem',
                              flexWrap: 'wrap',
                              justifyContent: 'flex-end',
                            }}
                          >
                            {fer.status === 'DISPONIVEL' && fer.ativo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFerramentaParaEmprestimo(fer)
                                  setUsuarioEmprestimoId('')
                                  setMensagemErro(null)
                                }}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  backgroundColor: '#0284c7',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Emprestar
                              </button>
                            )}

                            {fer.status === 'EMPRESTADO' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFerramentaParaDevolucao(fer)
                                  setDevolucaoComDefeito(false)
                                  setMensagemErro(null)
                                }}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  backgroundColor: '#16a34a',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Devolver
                              </button>
                            )}

                            {fer.status === 'COM_DEFEITO' && (
                              <button
                                type="button"
                                disabled={atualizarStatusFerramentaMutation.isPending}
                                onClick={() =>
                                  atualizarStatusFerramentaMutation.mutate({
                                    id: fer.id,
                                    dados: { status: 'DISPONIVEL' },
                                    mensagemOk: `Manutencao concluida: ${fer.codigo} (${fer.nome}) liberada para uso.`,
                                  })
                                }
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  backgroundColor: '#0f766e',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Liberar Conserto
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setFerramentaEmEdicao(fer)
                                setFormCodigo(fer.codigo)
                                setFormNome(fer.nome)
                                setModalFerramentaAberto(true)
                              }}
                              style={{
                                padding: '0.35rem 0.7rem',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                color: '#1e293b',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Editar
                            </button>

                            {fer.status !== 'EMPRESTADO' && (
                              <button
                                type="button"
                                disabled={atualizarStatusFerramentaMutation.isPending}
                                onClick={() =>
                                  atualizarStatusFerramentaMutation.mutate({
                                    id: fer.id,
                                    dados: { ativo: !fer.ativo },
                                    mensagemOk: fer.ativo
                                      ? `Ferramenta ${fer.codigo} inativada no catalogo.`
                                      : `Ferramenta ${fer.codigo} reativada no catalogo.`,
                                  })
                                }
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  backgroundColor: fer.ativo ? '#fff1f2' : '#f0fdf4',
                                  border: `1px solid ${fer.ativo ? '#fecdd3' : '#bbf7d0'}`,
                                  borderRadius: '4px',
                                  color: fer.ativo ? '#be123c' : '#15803d',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {fer.ativo ? 'Inativar' : 'Reativar'}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Emprestimo */}
      {ferramentaParaEmprestimo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Registrar Emprestimo de Ferramenta
              </h2>
              <button
                type="button"
                onClick={() => setFerramentaParaEmprestimo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.15rem',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: '#334155',
              }}
            >
              <div>
                <strong>Ferramenta:</strong> {ferramentaParaEmprestimo.codigo} -{' '}
                {ferramentaParaEmprestimo.nome}
              </div>
              <div style={{ marginTop: '0.25rem', color: '#64748b' }}>
                Selecione o colaborador responsavel pela retirada e guarda do equipamento.
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!usuarioEmprestimoId) {
                  setMensagemErro('Selecione o usuario solicitante para registrar o emprestimo.')
                  return
                }
                emprestarFerramentaMutation.mutate({
                  id: ferramentaParaEmprestimo.id,
                  usuarioId: usuarioEmprestimoId,
                })
              }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <div>
                <label
                  htmlFor="emprestimo-usuario"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.3rem',
                  }}
                >
                  Usuario Solicitante (Responsavel na Obra) *
                </label>
                <select
                  id="emprestimo-usuario"
                  required
                  value={usuarioEmprestimoId}
                  onChange={(e) => setUsuarioEmprestimoId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Selecione o colaborador...</option>
                  {usuariosAtivos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} (@{u.login} - {u.cargo?.nome || u.perfil})
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFerramentaParaEmprestimo(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={emprestarFerramentaMutation.isPending}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#0284c7',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {emprestarFerramentaMutation.isPending
                    ? 'Registrando...'
                    : 'Confirmar Emprestimo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Devolucao */}
      {ferramentaParaDevolucao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Registrar Devolucao de Ferramenta
              </h2>
              <button
                type="button"
                onClick={() => setFerramentaParaDevolucao(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.15rem',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: '#334155',
              }}
            >
              <div>
                <strong>Ferramenta:</strong> {ferramentaParaDevolucao.codigo} -{' '}
                {ferramentaParaDevolucao.nome}
              </div>
              {ferramentaParaDevolucao.emprestadoPara && (
                <div style={{ marginTop: '0.25rem' }}>
                  <strong>Devolvida por:</strong> {ferramentaParaDevolucao.emprestadoPara.nome} (@
                  {ferramentaParaDevolucao.emprestadoPara.login})
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                devolverFerramentaMutation.mutate({
                  id: ferramentaParaDevolucao.id,
                  comDefeito: devolucaoComDefeito,
                })
              }}
              style={{ display: 'grid', gap: '0.85rem' }}
            >
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  Condicao de retorno ao almoxarifado:
                </span>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: `1px solid ${!devolucaoComDefeito ? '#16a34a' : '#cbd5e1'}`,
                    backgroundColor: !devolucaoComDefeito ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                  }}
                >
                  <input
                    type="radio"
                    name="condicao-devolucao"
                    checked={!devolucaoComDefeito}
                    onChange={() => setDevolucaoComDefeito(false)}
                  />
                  <span>
                    <strong>Devolvida em perfeito estado</strong> (Retorna para Disponivel)
                  </span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: `1px solid ${devolucaoComDefeito ? '#dc2626' : '#cbd5e1'}`,
                    backgroundColor: devolucaoComDefeito ? '#fef2f2' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                  }}
                >
                  <input
                    type="radio"
                    name="condicao-devolucao"
                    checked={devolucaoComDefeito}
                    onChange={() => setDevolucaoComDefeito(true)}
                  />
                  <span>
                    <strong>Devolvida com defeito / avaria</strong> (Bloqueia para Manutencao)
                  </span>
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFerramentaParaDevolucao(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={devolverFerramentaMutation.isPending}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: devolucaoComDefeito ? '#dc2626' : '#16a34a',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {devolverFerramentaMutation.isPending
                    ? 'Confirmando...'
                    : 'Confirmar Devolucao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Ferramenta */}
      {modalFerramentaAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {ferramentaEmEdicao
                  ? `Editar Ferramenta (${ferramentaEmEdicao.codigo})`
                  : 'Nova Ferramenta'}
              </h2>
              <button
                type="button"
                onClick={() => setModalFerramentaAberto(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                salvarFerramentaMutation.mutate()
              }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <div>
                <label
                  htmlFor="ferramenta-codigo"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.25rem',
                  }}
                >
                  Código / Identificação da Obra *
                </label>
                <input
                  id="ferramenta-codigo"
                  type="text"
                  required
                  disabled={!!ferramentaEmEdicao}
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                  placeholder="Ex: MART-01 ou TAG-549"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    backgroundColor: ferramentaEmEdicao ? '#f1f5f9' : '#ffffff',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="ferramenta-nome"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.25rem',
                  }}
                >
                  Nome da Ferramenta *
                </label>
                <input
                  id="ferramenta-nome"
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Martelete Perfurador Rompedor 800W"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalFerramentaAberto(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvarFerramentaMutation.isPending}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#0284c7',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {salvarFerramentaMutation.isPending ? 'Salvando...' : 'Salvar Ferramenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default FerramentasPage
