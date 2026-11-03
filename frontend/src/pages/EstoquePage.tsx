import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createLocalEstoque,
  deleteLocalEstoque,
  getAreasObra,
  getLocaisEstoque,
  getMateriais,
  getMovimentacoesEstoque,
  getObras,
  getSaldosEstoque,
  registrarMovimentacaoEstoque,
  toggleLocalEstoqueSituacao,
  updateLocalEstoque,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { LocalEstoque, RegistrarMovimentacaoInput, TipoMovimentacao } from '../types/estoque'

function extrairErro(err: any, fallback: string): string {
  const data = err.response?.data
  if (!data) return fallback
  if (data.campos && typeof data.campos === 'object') {
    const detalhes = Object.entries(data.campos)
      .map(([campo, msg]) => `${campo}: ${msg}`)
      .join(' | ')
    return `${data.erro || 'Dados invalidos'}: ${detalhes}`
  }
  if (data.mensagem) return data.mensagem
  if (data.erro) return data.erro
  return fallback
}

function gerarChaveIdempotencia(): string {
  return 'mov-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
}

const LABELS_TIPO_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  ENTRADA_RECEB: 'Entrada por Recebimento / NF',
  SAIDA_REQ: 'Saida para Aplicacao na Obra',
  ENTRADA_DEVOL: 'Entrada por Devolucao de Canteiro',
  SAIDA_TRANSF: 'Saida por Transferencia',
  ENTRADA_TRANSF: 'Entrada por Transferencia',
  AJUSTE_INV: 'Ajuste Positivo de Inventario',
  ESTORNO: 'Estorno / Baixa Corretiva',
}

export function EstoquePage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  // Aba ativa
  const [abaAtiva, setAbaAtiva] = useState<'saldos' | 'kardex' | 'locais'>('saldos')

  // Filtros gerais
  const [filtroObraId, setFiltroObraId] = useState('')
  const [filtroLocalId, setFiltroLocalId] = useState('')
  const [buscaMaterial, setBuscaMaterial] = useState('')
  const [filtroTipoMov, setFiltroTipoMov] = useState<string>('')

  // Modal: Lancar Movimentacao
  const [modalMovAberto, setModalMovAberto] = useState(false)
  const [movObraId, setMovObraId] = useState('')
  const [movLocalId, setMovLocalId] = useState('')
  const [movMaterialId, setMovMaterialId] = useState('')
  const [movTipo, setMovTipo] = useState<TipoMovimentacao>('ENTRADA_RECEB')
  const [movQuantidade, setMovQuantidade] = useState<string>('1')
  const [movUsarUnidadeCompra, setMovUsarUnidadeCompra] = useState(false)
  const [movAreaId, setMovAreaId] = useState('')
  const [movObservacao, setMovObservacao] = useState('')
  const [chaveIdempotencia, setChaveIdempotencia] = useState(gerarChaveIdempotencia())
  const [erroMov, setErroMov] = useState<string | null>(null)

  // Modal: Novo / Editar Local (Locacao) de Estoque
  const [modalLocalAberto, setModalLocalAberto] = useState(false)
  const [localEditando, setLocalEditando] = useState<LocalEstoque | null>(null)
  const [localObraId, setLocalObraId] = useState('')
  const [localNome, setLocalNome] = useState('')
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [erroAcaoLocal, setErroAcaoLocal] = useState<string | null>(null)

  const podeMovimentar =
    usuario?.perfil === 'ADMIN' || usuario?.perfil === 'ALMOXARIFE'
  const podeGerenciarLocais =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ALMOXARIFE' ||
    usuario?.perfil === 'ENGENHARIA'

  // Queries
  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => getObras(true),
  })

  const { data: locaisAtivos = [] } = useQuery({
    queryKey: ['locais-estoque-ativos'],
    queryFn: () => getLocaisEstoque(undefined, true),
  })

  // CORRECAO: undefined no segundo parametro para trazer TODOS os locais (ativos e inativos)
  const { data: todosOsLocais = [], isLoading: carregandoLocais } = useQuery({
    queryKey: ['locais-estoque-todos', filtroObraId],
    queryFn: () => getLocaisEstoque(filtroObraId || undefined, undefined),
  })

  const { data: materiais = [] } = useQuery({
    queryKey: ['materiais-ativos'],
    queryFn: () => getMateriais({ somenteAtivos: true }),
  })

  const { data: saldos = [], isLoading: carregandoSaldos } = useQuery({
    queryKey: ['estoque-saldos', filtroObraId, filtroLocalId, buscaMaterial],
    queryFn: () =>
      getSaldosEstoque({
        obraId: filtroObraId || undefined,
        localId: filtroLocalId || undefined,
        busca: buscaMaterial || undefined,
      }),
  })

  const { data: movimentacoes = [], isLoading: carregandoKardex } = useQuery({
    queryKey: ['estoque-movimentacoes', filtroObraId, filtroLocalId, filtroTipoMov],
    queryFn: () =>
      getMovimentacoesEstoque({
        obraId: filtroObraId || undefined,
        localId: filtroLocalId || undefined,
        tipo: (filtroTipoMov as TipoMovimentacao) || undefined,
      }),
  })

  // Locacoes ativas pertencentes a obra selecionada no modal de movimentacao
  const locacoesDaObraNoModal = movObraId
    ? locaisAtivos.filter((l) => l.obraId === movObraId)
    : locaisAtivos

  const { data: areasDaObraModal = [] } = useQuery({
    queryKey: ['areas-obra', movObraId],
    queryFn: () => getAreasObra(movObraId, true),
    enabled: !!movObraId,
  })

  const materialSelecionadoNoModal = materiais.find((m) => m.id === movMaterialId)
  const ehTipoEntrada =
    movTipo === 'ENTRADA_RECEB' ||
    movTipo === 'ENTRADA_DEVOL' ||
    movTipo === 'ENTRADA_TRANSF' ||
    movTipo === 'AJUSTE_INV'
  const permiteConversaoCompra =
    ehTipoEntrada &&
    !!materialSelecionadoNoModal?.unidadeCompra &&
    Number(materialSelecionadoNoModal?.fatorConversao) > 1

  // Mutations
  const registrarMovMutation = useMutation({
    mutationFn: (dados: RegistrarMovimentacaoInput) => registrarMovimentacaoEstoque(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-saldos'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] })
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-ativos'] })
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-todos'] })
      setModalMovAberto(false)
      limparFormMov()
    },
    onError: (err: any) => {
      setErroMov(extrairErro(err, 'Erro ao registrar movimentacao de estoque'))
    },
  })

  const criarLocalMutation = useMutation({
    mutationFn: (dados: { obraId: string; nome: string }) => createLocalEstoque(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-ativos'] })
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-todos'] })
      setModalLocalAberto(false)
      setLocalEditando(null)
      setLocalNome('')
      setLocalObraId('')
      setErroLocal(null)
    },
    onError: (err: any) => {
      setErroLocal(extrairErro(err, 'Erro ao cadastrar locacao de estoque'))
    },
  })

  const editarLocalMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => updateLocalEstoque(id, nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-ativos'] })
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-todos'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-saldos'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] })
      setModalLocalAberto(false)
      setLocalEditando(null)
      setLocalNome('')
      setLocalObraId('')
      setErroLocal(null)
    },
    onError: (err: any) => {
      setErroLocal(extrairErro(err, 'Erro ao atualizar locacao de estoque'))
    },
  })

  const toggleLocalMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      toggleLocalEstoqueSituacao(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-ativos'] })
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-todos'] })
      setErroAcaoLocal(null)
    },
    onError: (err: any) => {
      setErroAcaoLocal(extrairErro(err, 'Nao foi possivel alterar a situacao da locacao'))
    },
  })

  const excluirLocalMutation = useMutation({
    mutationFn: (id: string) => deleteLocalEstoque(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-ativos'] })
      queryClient.invalidateQueries({ queryKey: ['locais-estoque-todos'] })
      setErroAcaoLocal(null)
    },
    onError: (err: any) => {
      setErroAcaoLocal(extrairErro(err, 'Nao foi possivel excluir a locacao'))
    },
  })

  function limparFormMov() {
    setMovObraId(filtroObraId || '')
    setMovLocalId('')
    setMovMaterialId('')
    setMovTipo('ENTRADA_RECEB')
    setMovQuantidade('1')
    setMovUsarUnidadeCompra(false)
    setMovAreaId('')
    setMovObservacao('')
    setChaveIdempotencia(gerarChaveIdempotencia())
    setErroMov(null)
  }

  function handleSubmeterMovimentacao(e: FormEvent) {
    e.preventDefault()
    setErroMov(null)

    const qtdNum = parseFloat(movQuantidade)
    if (!movObraId && !movLocalId) {
      setErroMov('Selecione a obra da movimentacao')
      return
    }
    if (!movMaterialId) {
      setErroMov('Selecione o material')
      return
    }
    if (isNaN(qtdNum) || qtdNum <= 0) {
      setErroMov('Informe uma quantidade maior que zero')
      return
    }

    registrarMovMutation.mutate({
      obraId: movObraId || null,
      localId: movLocalId || null,
      materialId: movMaterialId,
      tipo: movTipo,
      quantidade: qtdNum,
      usarUnidadeCompra: permiteConversaoCompra ? movUsarUnidadeCompra : false,
      areaId: movAreaId || null,
      observacao: movObservacao.trim() || null,
      chaveIdempotencia,
    })
  }

  function handleSubmeterLocal(e: FormEvent) {
    e.preventDefault()
    setErroLocal(null)

    if (!localEditando && !localObraId) {
      setErroLocal('Selecione a obra vinculada a locacao')
      return
    }
    if (localNome.trim().length < 3) {
      setErroLocal('Informe um nome com pelo menos 3 caracteres')
      return
    }

    if (localEditando) {
      editarLocalMutation.mutate({
        id: localEditando.id,
        nome: localNome.trim(),
      })
    } else {
      criarLocalMutation.mutate({
        obraId: localObraId,
        nome: localNome.trim(),
      })
    }
  }

  function abrirModalNovoLocal() {
    setLocalEditando(null)
    setLocalObraId(filtroObraId || '')
    setLocalNome('')
    setErroLocal(null)
    setModalLocalAberto(true)
  }

  function abrirModalEditarLocal(loc: LocalEstoque) {
    setLocalEditando(loc)
    setLocalObraId(loc.obraId)
    setLocalNome(loc.nome)
    setErroLocal(null)
    setModalLocalAberto(true)
  }

  const locaisFiltradosNoSelect = filtroObraId
    ? locaisAtivos.filter((l) => l.obraId === filtroObraId)
    : locaisAtivos

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 pb-24 font-body text-on-surface">
      {/* Cabecalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 8px', fontSize: '2rem' }}>
            Estoque Fisico e Livro-Razao (Kardex)
          </h1>
          <p style={{ color: '#475569', margin: 0, fontSize: '0.875rem' }}>
            Controle de saldos disponiveis, recebimentos com conversao, locacoes opcionais e trilha imutavel
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {podeGerenciarLocais && (
            <button
              onClick={abrirModalNovoLocal}
              style={{
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              + Nova Locacao (Opcional)
            </button>
          )}

          {podeMovimentar && (
            <button
              onClick={() => {
                limparFormMov()
                setModalMovAberto(true)
              }}
              style={{
                backgroundColor: '#0369a1',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              + Lancar Movimentacao
            </button>
          )}
        </div>
      </div>

      {/* Navegacao por Abas */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => setAbaAtiva('saldos')}
          style={{
            padding: '16px 24px',
            background: 'none',
            border: 'none',
            borderBottom: abaAtiva === 'saldos' ? '3px solid #0369a1' : '3px solid transparent',
            color: abaAtiva === 'saldos' ? '#0369a1' : '#475569',
            fontWeight: abaAtiva === 'saldos' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '8px',
          }}
        >
          Saldos em Estoque ({saldos.length})
        </button>

        <button
          onClick={() => setAbaAtiva('kardex')}
          style={{
            padding: '16px 24px',
            background: 'none',
            border: 'none',
            borderBottom: abaAtiva === 'kardex' ? '3px solid #0369a1' : '3px solid transparent',
            color: abaAtiva === 'kardex' ? '#0369a1' : '#475569',
            fontWeight: abaAtiva === 'kardex' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '8px',
          }}
        >
          Livro-Razao / Kardex ({movimentacoes.length})
        </button>

        <button
          onClick={() => setAbaAtiva('locais')}
          style={{
            padding: '16px 24px',
            background: 'none',
            border: 'none',
            borderBottom: abaAtiva === 'locais' ? '3px solid #0369a1' : '3px solid transparent',
            color: abaAtiva === 'locais' ? '#0369a1' : '#475569',
            fontWeight: abaAtiva === 'locais' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '8px',
          }}
        >
          Locacoes de Estoque ({todosOsLocais.length})
        </button>
      </div>

      {/* Filtros Compartilhados (Obra e Locacao) */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <select
          aria-label="Filtrar por Obra"
          value={filtroObraId}
          onChange={(e) => {
            setFiltroObraId(e.target.value)
            setFiltroLocalId('')
          }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontSize: '0.875rem',
          }}
        >
          <option value="">Todas as Obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.codigo} - {o.nome}
            </option>
          ))}
        </select>

        {abaAtiva !== 'locais' && (
          <select
            aria-label="Filtrar por Local de Estoque"
            value={filtroLocalId}
            onChange={(e) => setFiltroLocalId(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '0.875rem',
            }}
          >
            <option value="">Todas as Locacoes de Estoque</option>
            {locaisFiltradosNoSelect.map((l) => (
              <option key={l.id} value={l.id}>
                {l.obra?.codigo} - {l.nome}
              </option>
            ))}
          </select>
        )}

        {abaAtiva === 'saldos' && (
          <input
            type="text"
            placeholder="Buscar material por codigo ou descricao..."
            value={buscaMaterial}
            onChange={(e) => setBuscaMaterial(e.target.value)}
            style={{
              flex: '1',
              minWidth: '240px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '0.875rem',
            }}
          />
        )}

        {abaAtiva === 'kardex' && (
          <select
            aria-label="Filtrar por Tipo de Movimentacao"
            value={filtroTipoMov}
            onChange={(e) => setFiltroTipoMov(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '0.875rem',
            }}
          >
            <option value="">Todos os Tipos de Operacao</option>
            {Object.entries(LABELS_TIPO_MOVIMENTACAO).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ABA 1: SALDOS EM ESTOQUE */}
      {abaAtiva === 'saldos' && (
        <>
          {carregandoSaldos ? (
            <p style={{ color: '#475569' }}>Carregando saldos de estoque...</p>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '16px 16px' }}>Codigo</th>
                    <th style={{ padding: '16px 16px' }}>Material</th>
                    <th style={{ padding: '16px 16px' }}>Obra / Locacao</th>
                    <th style={{ padding: '16px 16px', textAlign: 'right' }}>Saldo Fisico</th>
                    <th style={{ padding: '16px 16px', textAlign: 'right' }}>Reservado</th>
                    <th style={{ padding: '16px 16px', textAlign: 'right' }}>Disponivel</th>
                  </tr>
                </thead>
                <tbody>
                  {saldos.map((s) => (
                    <tr key={`${s.localId}-${s.materialId}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#0369a1' }}>
                        {s.material.codigo}
                      </td>
                      <td style={{ padding: '16px 16px', fontWeight: 400, color: '#0f172a' }}>
                        {s.material.descricao}
                        <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                          Categoria: {s.material.categoria?.nome || 'Geral'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 16px', color: '#334155' }}>
                        <strong>{s.local.obra.codigo}</strong> &bull; {s.local.nome}
                      </td>
                      <td style={{ padding: '16px 16px', textAlign: 'right', color: '#334155', fontWeight: 400 }}>
                        {s.quantidade} {s.material.unidadeConsumo.sigla}
                      </td>
                      <td style={{ padding: '16px 16px', textAlign: 'right', color: '#b45309' }}>
                        {s.reservado} {s.material.unidadeConsumo.sigla}
                      </td>
                      <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                        <span
                          style={{
                            backgroundColor: s.disponivel > 0 ? '#dcfce7' : '#fee2e2',
                            color: s.disponivel > 0 ? '#166534' : '#991b1b',
                            padding: '8px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                          }}
                        >
                          {s.disponivel} {s.material.unidadeConsumo.sigla}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {saldos.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>
                        Nenhum saldo de estoque registrado para os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ABA 2: LIVRO-RAZAO / KARDEX */}
      {abaAtiva === 'kardex' && (
        <>
          {carregandoKardex ? (
            <p style={{ color: '#475569' }}>Carregando historico do Livro-Razao...</p>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '16px 16px' }}>Data / Hora</th>
                    <th style={{ padding: '16px 16px' }}>Operacao</th>
                    <th style={{ padding: '16px 16px' }}>Material</th>
                    <th style={{ padding: '16px 16px', textAlign: 'right' }}>Qtd</th>
                    <th style={{ padding: '16px 16px' }}>Obra / Locacao</th>
                    <th style={{ padding: '16px 16px' }}>Responsavel</th>
                    <th style={{ padding: '16px 16px' }}>Observacao</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((m) => {
                    const ehEnt = m.natureza === 'ENTRADA'
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {new Date(m.registradaEm).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '16px 16px' }}>
                          <span
                            style={{
                              backgroundColor: ehEnt ? '#dcfce7' : '#fee2e2',
                              color: ehEnt ? '#166534' : '#991b1b',
                              padding: '8px 8px',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              marginRight: '8px',
                            }}
                          >
                            {ehEnt ? '+ ENTRADA' : '- SAIDA'}
                          </span>
                          <span style={{ color: '#334155', fontSize: '0.875rem' }}>
                            {LABELS_TIPO_MOVIMENTACAO[m.tipo] || m.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '16px 16px', fontWeight: 400, color: '#0f172a' }}>
                          {m.material.codigo} - {m.material.descricao}
                        </td>
                        <td
                          style={{
                            padding: '16px 16px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: ehEnt ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {ehEnt ? '+' : '-'}
                          {m.quantidade} {m.material.unidadeConsumo.sigla}
                        </td>
                        <td style={{ padding: '16px 16px', color: '#334155' }}>
                          <strong>{m.local.obra.codigo}</strong> &bull; {m.local.nome}
                          {m.area && (
                            <div style={{ fontSize: '0.875rem', color: '#0369a1' }}>
                              Destino: {m.area.nome}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 16px', color: '#475569' }}>
                          {m.usuario.nome}
                        </td>
                        <td style={{ padding: '16px 16px', color: '#475569' }}>
                          {m.observacao || '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {movimentacoes.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>
                        Nenhuma movimentacao registrada no Livro-Razao.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ABA 3: LOCACOES DE ESTOQUE */}
      {abaAtiva === 'locais' && (
        <>
          <div
            style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              padding: '16px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '0.875rem',
              color: '#0369a1',
            }}
          >
            As locacoes sao subdivisoes fisicas opcionais do almoxarifado da obra (ex: Prateleira A1, Container 02, Patio Externo). Caso nao informe uma locacao ao lancar uma movimentacao, o sistema utilizara automaticamente o <strong>Almoxarifado Geral</strong> da obra.
          </div>

          {erroAcaoLocal && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                padding: '16px 16px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '0.875rem',
                border: '1px solid #fecaca',
              }}
            >
              {erroAcaoLocal}
            </div>
          )}

          {carregandoLocais ? (
            <p style={{ color: '#475569' }}>Carregando locacoes de estoque...</p>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '16px 16px' }}>Obra</th>
                    <th style={{ padding: '16px 16px' }}>Nome da Locacao / Almoxarifado</th>
                    <th style={{ padding: '16px 16px' }}>Itens / Movimentacoes</th>
                    <th style={{ padding: '16px 16px' }}>Situacao</th>
                    <th style={{ padding: '16px 16px', textAlign: 'right' }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {todosOsLocais.map((loc) => {
                    const semHistorico =
                      (loc._count?.saldos ?? 0) === 0 && (loc._count?.movimentacoes ?? 0) === 0
                    return (
                      <tr key={loc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 16px', fontWeight: 600, color: '#0369a1' }}>
                          {loc.obra?.codigo} - {loc.obra?.nome}
                        </td>
                        <td style={{ padding: '16px 16px', fontWeight: 400, color: '#0f172a' }}>
                          {loc.nome}
                        </td>
                        <td style={{ padding: '16px 16px', color: '#475569', fontSize: '0.875rem' }}>
                          {loc._count?.saldos ?? 0} materiais &bull; {loc._count?.movimentacoes ?? 0} lancamentos
                        </td>
                        <td style={{ padding: '16px 16px' }}>
                          <span
                            style={{
                              backgroundColor: loc.ativo ? '#dcfce7' : '#fee2e2',
                              color: loc.ativo ? '#166534' : '#991b1b',
                              padding: '8px 8px',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            {loc.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                          {podeGerenciarLocais && (
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                onClick={() => abrirModalEditarLocal(loc)}
                                style={{
                                  backgroundColor: '#f8fafc',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                  padding: '8px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                }}
                              >
                                Editar
                              </button>
                              <button
                                disabled={toggleLocalMutation.isPending}
                                onClick={() => toggleLocalMutation.mutate({ id: loc.id, ativo: !loc.ativo })}
                                style={{
                                  backgroundColor: loc.ativo ? '#fef2f2' : '#f0fdf4',
                                  color: loc.ativo ? '#b91c1c' : '#15803d',
                                  border: `1px solid ${loc.ativo ? '#fecaca' : '#bbf7d0'}`,
                                  padding: '8px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                }}
                              >
                                {loc.ativo ? 'Desativar' : 'Ativar'}
                              </button>
                              {semHistorico && (
                                <button
                                  disabled={excluirLocalMutation.isPending}
                                  onClick={() => excluirLocalMutation.mutate(loc.id)}
                                  style={{
                                    backgroundColor: '#ffffff',
                                    color: '#991b1b',
                                    border: '1px solid #fca5a5',
                                    padding: '8px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  Excluir
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {todosOsLocais.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>
                        Nenhuma locacao de estoque cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* MODAL: LANCAR MOVIMENTACAO DE ESTOQUE */}
      {modalMovAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: '1rem', color: '#0f172a' }}>
              Lancar Movimentacao de Estoque
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#475569' }}>
              Toda movimentacao grava um registro imutavel no Livro-Razao e atualiza o saldo atomicamente.
            </p>

            {erroMov && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '16px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroMov}
              </div>
            )}

            <form onSubmit={handleSubmeterMovimentacao} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                  Tipo de Operacao
                </label>
                <select
                  value={movTipo}
                  onChange={(e) => {
                    setMovTipo(e.target.value as TipoMovimentacao)
                    setMovUsarUnidadeCompra(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                >
                  {Object.entries(LABELS_TIPO_MOVIMENTACAO).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                    Obra
                  </label>
                  <select
                    value={movObraId}
                    onChange={(e) => {
                      setMovObraId(e.target.value)
                      setMovLocalId('')
                      setMovAreaId('')
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">Selecione a obra...</option>
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.codigo} - {o.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                    Locacao do Estoque (opcional)
                  </label>
                  <select
                    value={movLocalId}
                    onChange={(e) => {
                      const val = e.target.value
                      setMovLocalId(val)
                      if (val) {
                        const loc = locaisAtivos.find((l) => l.id === val)
                        if (loc && loc.obraId !== movObraId) {
                          setMovObraId(loc.obraId)
                          setMovAreaId('')
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">Padrao (Almoxarifado Geral)</option>
                    {locacoesDaObraNoModal.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.obra?.codigo ? `${l.obra.codigo} - ${l.nome}` : l.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                  Material
                </label>
                <select
                  value={movMaterialId}
                  onChange={(e) => {
                    setMovMaterialId(e.target.value)
                    setMovUsarUnidadeCompra(false)
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                >
                  <option value="">Selecione o material...</option>
                  {materiais.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.codigo} - {m.descricao} ({m.unidadeConsumo.sigla})
                    </option>
                  ))}
                </select>
              </div>

              {permiteConversaoCompra && materialSelecionadoNoModal && (
                <div
                  style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    padding: '16px',
                    borderRadius: '6px',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#0369a1' }}>
                    <input
                      type="checkbox"
                      checked={movUsarUnidadeCompra}
                      onChange={(e) => setMovUsarUnidadeCompra(e.target.checked)}
                    />
                    Converter entrada pela Unidade de Compra ({materialSelecionadoNoModal.unidadeCompra?.sigla})
                  </label>
                  <div style={{ fontSize: '0.875rem', color: '#0369a1', marginTop: '8px' }}>
                    Fator configurado: 1 {materialSelecionadoNoModal.unidadeCompra?.sigla} ={' '}
                    {Number(materialSelecionadoNoModal.fatorConversao)} {materialSelecionadoNoModal.unidadeConsumo.sigla}.
                    {movUsarUnidadeCompra && (
                      <strong style={{ display: 'block', marginTop: '8px' }}>
                        Total que entrara no estoque:{' '}
                        {(
                          (parseFloat(movQuantidade) || 0) *
                          Number(materialSelecionadoNoModal.fatorConversao)
                        ).toFixed(2)}{' '}
                        {materialSelecionadoNoModal.unidadeConsumo.sigla}
                      </strong>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                    Quantidade{' '}
                    {materialSelecionadoNoModal
                      ? `(${
                          movUsarUnidadeCompra && materialSelecionadoNoModal.unidadeCompra
                            ? materialSelecionadoNoModal.unidadeCompra.sigla
                            : materialSelecionadoNoModal.unidadeConsumo.sigla
                        })`
                      : ''}
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    required
                    value={movQuantidade}
                    onChange={(e) => setMovQuantidade(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                    Area / Pavimento (opcional)
                  </label>
                  <select
                    value={movAreaId}
                    onChange={(e) => setMovAreaId(e.target.value)}
                    disabled={!movObraId}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: !movObraId ? '#f1f5f9' : '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">Sem area especifica</option>
                    {areasDaObraModal.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                  Observacao / Documento (opcional)
                </label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder="ex: Nota Fiscal 4590 ou ajuste de conferencia"
                  value={movObservacao}
                  onChange={(e) => setMovObservacao(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalMovAberto(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 400,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registrarMovMutation.isPending}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0369a1',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {registrarMovMutation.isPending ? 'Registrando...' : 'Confirmar Lancamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA / EDITAR LOCACAO DE ESTOQUE */}
      {modalLocalAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#0f172a' }}>
              {localEditando ? 'Editar Locacao de Estoque' : 'Cadastrar Nova Locacao de Estoque'}
            </h2>

            {erroLocal && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '16px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroLocal}
              </div>
            )}

            <form onSubmit={handleSubmeterLocal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                  Obra Vinculada
                </label>
                <select
                  value={localObraId}
                  onChange={(e) => setLocalObraId(e.target.value)}
                  required
                  disabled={!!localEditando}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: localEditando ? '#f1f5f9' : '#ffffff',
                    color: '#0f172a',
                  }}
                >
                  <option value="">Selecione a obra...</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.codigo} - {o.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                  Nome da Locacao / Prateleira / Container
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Locacao 01 - Prateleira A"
                  value={localNome}
                  onChange={(e) => setLocalNome(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalLocalAberto(false)
                    setLocalEditando(null)
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 400,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarLocalMutation.isPending || editarLocalMutation.isPending}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0369a1',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {criarLocalMutation.isPending || editarLocalMutation.isPending
                    ? 'Salvando...'
                    : 'Salvar Locacao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
