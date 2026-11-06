import { useState, useMemo, type FormEvent } from 'react'
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
  const [filtroObraId, setFiltroObraId] = useState(usuario?.obraId || '')
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

  // Agrupamento de saldos por Material para evitar repeticao de codigo de material na tabela
  const saldosAgrupadosPorMaterial = useMemo(() => {
    // Se o usuario filtrou especificamente por um Local/Galpao, exibe os registros daquele local individual
    if (filtroLocalId) {
      return saldos.map((s) => ({
        materialId: s.materialId,
        material: s.material,
        saldoFisicoTotal: s.quantidade || 0,
        reservadoTotal: s.reservado || 0,
        disponivelTotal: s.disponivel || 0,
        obraCodigo: s.local.obra.codigo,
        detalheLocacao: s.local.nome,
        locacoesDetalhadas: [s],
      }))
    }

    const mapa = new Map<
      string,
      {
        materialId: string
        material: any
        saldoFisicoTotal: number
        reservadoTotal: number
        disponivelTotal: number
        obraCodigo: string
        detalheLocacao: string
        locacoesDetalhadas: typeof saldos
      }
    >()

    for (const s of saldos) {
      const chave = s.materialId
      const existente = mapa.get(chave)
      const qtd = Number(s.quantidade || 0)
      const res = Number(s.reservado || 0)
      const disp = Number(s.disponivel || 0)

      if (existente) {
        existente.saldoFisicoTotal = Number((existente.saldoFisicoTotal + qtd).toFixed(4))
        existente.reservadoTotal = Number((existente.reservadoTotal + res).toFixed(4))
        existente.disponivelTotal = Number((existente.disponivelTotal + disp).toFixed(4))
        existente.locacoesDetalhadas.push(s)
      } else {
        mapa.set(chave, {
          materialId: s.materialId,
          material: s.material,
          saldoFisicoTotal: qtd,
          reservadoTotal: res,
          disponivelTotal: disp,
          obraCodigo: s.local.obra.codigo,
          detalheLocacao: s.local.nome,
          locacoesDetalhadas: [s],
        })
      }
    }

    return Array.from(mapa.values())
  }, [saldos, filtroLocalId])

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
    const obraPadrao = usuario?.obraId || (obras.length === 1 ? obras[0].id : '') || filtroObraId || ''
    setMovObraId(obraPadrao)
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
    const obraPadrao = usuario?.obraId || (obras.length === 1 ? obras[0].id : '') || filtroObraId || ''
    setLocalObraId(obraPadrao)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="ob-heading text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Estoque Fisico e Livro-Razao (Kardex)
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-body">
            Controle de saldos disponiveis, recebimentos com conversao, locacoes opcionais e trilha imutavel
          </p>
        </div>

        <div className="flex gap-2 sm:gap-3 flex-wrap">
          {podeGerenciarLocais && (
            <button
              type="button"
              onClick={abrirModalNovoLocal}
              className="ob-btn ob-btn--outline ob-btn--sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_location</span>
              + Nova Locacao (Opcional)
            </button>
          )}

          {podeMovimentar && (
            <button
              type="button"
              onClick={() => {
                limparFormMov()
                setModalMovAberto(true)
              }}
              className="ob-btn ob-btn--primary ob-btn--sm"
            >
              <span className="material-symbols-outlined text-[18px]">swap_vert</span>
              + Lancar Movimentacao
            </button>
          )}
        </div>
      </div>

      {/* Navegacao por Abas usando ob-tabs */}
      <div className="ob-tabs mb-6" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'saldos'}
          onClick={() => setAbaAtiva('saldos')}
          className="ob-tab"
        >
          Saldos em Estoque ({saldos.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'kardex'}
          onClick={() => setAbaAtiva('kardex')}
          className="ob-tab"
        >
          Livro-Razao / Kardex ({movimentacoes.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'locais'}
          onClick={() => setAbaAtiva('locais')}
          className="ob-tab"
        >
          Locacoes de Estoque ({todosOsLocais.length})
        </button>
      </div>

      {/* KPIs de Estoque usando ob-card e ob-stat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="ob-card ob-stat">
          <span className="ob-muted text-xs">Materiais com saldo</span>
          <div className="ob-stat__v ob-mono text-2xl sm:text-3xl font-bold text-on-surface">
            {saldos.filter((s) => s.quantidade > 0).length}
          </div>
          <div className="ob-stat__d text-xs text-on-surface-variant">em estoque físico</div>
        </div>

        <div className="ob-card ob-stat">
          <span className="ob-muted text-xs">Abaixo do mínimo</span>
          <div className="ob-stat__v ob-mono text-2xl sm:text-3xl font-bold text-tertiary">
            {saldos.filter((s) => s.disponivel > 0 && s.disponivel < 10).length}
          </div>
          <div className="ob-stat__d text-xs text-on-surface-variant">repor em breve</div>
        </div>

        <div className="ob-card ob-stat">
          <span className="ob-muted text-xs">Sem saldo disponível</span>
          <div className="ob-stat__v ob-mono text-2xl sm:text-3xl font-bold text-error">
            {saldos.filter((s) => s.disponivel === 0).length}
          </div>
          <div className="ob-stat__d text-xs text-on-surface-variant">bloqueia requisição</div>
        </div>

        <div className="ob-card ob-stat">
          <span className="ob-muted text-xs">Movimentações</span>
          <div className="ob-stat__v ob-mono text-2xl sm:text-3xl font-bold text-on-surface">
            {movimentacoes.length}
          </div>
          <div className="ob-stat__d text-xs text-on-surface-variant">registros no Kardex</div>
        </div>
      </div>

      {/* Filtros Compartilhados (Obra e Locacao) */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center">
        {usuario?.obraId || obras.length === 1 ? (
          <div className="ob-input w-full sm:w-auto min-w-[200px] bg-surface-container font-semibold text-on-surface flex items-center justify-between">
            <span>
              {usuario?.obra
                ? `${usuario.obra.codigo} - ${usuario.obra.nome}`
                : obras[0]
                  ? `${obras[0].codigo} - ${obras[0].nome}`
                  : 'Obra'}
            </span>
            <span className="text-xs text-secondary font-normal ml-2">(Obra Fixa)</span>
          </div>
        ) : (
          <select
            aria-label="Filtrar por Obra"
            value={filtroObraId}
            onChange={(e) => {
              setFiltroObraId(e.target.value)
              setFiltroLocalId('')
            }}
            className="ob-input w-full sm:w-auto min-w-[200px]"
          >
            <option value="">Todas as Obras</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codigo} - {o.nome}
              </option>
            ))}
          </select>
        )}

        {abaAtiva !== 'locais' && (
          <select
            aria-label="Filtrar por Local de Estoque"
            value={filtroLocalId}
            onChange={(e) => setFiltroLocalId(e.target.value)}
            className="ob-input w-full sm:w-auto min-w-[200px]"
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
          <div className="ob-search flex-1 min-w-[220px]">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Buscar material por codigo ou descricao..."
              value={buscaMaterial}
              onChange={(e) => setBuscaMaterial(e.target.value)}
              className="ob-input"
            />
          </div>
        )}

        {abaAtiva === 'kardex' && (
          <select
            aria-label="Filtrar por Tipo de Movimentacao"
            value={filtroTipoMov}
            onChange={(e) => setFiltroTipoMov(e.target.value)}
            className="ob-input w-full sm:w-auto min-w-[200px]"
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
            <p className="text-on-surface-variant p-4">Carregando saldos de estoque...</p>
          ) : (
            <div className="ob-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="ob-table">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Material</th>
                      <th>Obra / Locacao</th>
                      <th className="num">Saldo Fisico</th>
                      <th className="num">Reservado</th>
                      <th className="num">Disponivel</th>
                      <th style={{ width: '9rem' }}>Nível</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saldosAgrupadosPorMaterial.map((item) => {
                      const totalQtd = item.saldoFisicoTotal
                      const disp = item.disponivelTotal
                      const res = item.reservadoTotal
                      const pctDisp = totalQtd > 0 ? `${Math.min(100, Math.round((disp / totalQtd) * 100))}%` : '0%'
                      const pctRes = totalQtd > 0 ? `${Math.min(100, Math.round((res / totalQtd) * 100))}%` : '0%'
                      const statusMeter = disp === 0 ? 'crit' : disp < 10 ? 'low' : 'ok'
                      const statusBadge = disp === 0 ? 'ob-badge--crit' : disp < 10 ? 'ob-badge--low' : 'ob-badge--ok'
                      const statusLabel = disp === 0 ? 'Sem saldo' : disp < 10 ? 'Abaixo do mín.' : 'Em estoque'

                      return (
                        <tr key={item.materialId}>
                          <td>
                            <span className="ob-mono font-semibold text-accent-text">
                              {item.material.codigo}
                            </span>
                          </td>
                          <td>
                            <div className="font-medium text-on-surface">{item.material.descricao}</div>
                            <div className="text-xs text-on-surface-variant">
                              Categoria: {item.material.categoria?.nome || 'Geral'}
                            </div>
                          </td>
                          <td className="text-on-surface-variant">
                            <strong className="text-on-surface">{item.obraCodigo}</strong>
                            {filtroLocalId ? (
                              <span> &bull; {item.detalheLocacao}</span>
                            ) : item.locacoesDetalhadas.length > 1 ? (
                              <div className="text-xs text-on-surface-variant mt-0.5">
                                Distribuido em {item.locacoesDetalhadas.length} locacoes:
                                <ul className="list-disc list-inside mt-0.5">
                                  {item.locacoesDetalhadas.map((l) => (
                                    <li key={l.localId}>
                                      {l.local.nome}: <strong>{l.disponivel} {item.material.unidadeConsumo.sigla}</strong>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <span> &bull; {item.detalheLocacao}</span>
                            )}
                          </td>
                          <td className="num">
                            {item.saldoFisicoTotal} {item.material.unidadeConsumo.sigla}
                          </td>
                          <td className="num text-tertiary">
                            {item.reservadoTotal} {item.material.unidadeConsumo.sigla}
                          </td>
                          <td className="num font-bold text-on-surface">
                            {item.disponivelTotal} {item.material.unidadeConsumo.sigla}
                          </td>
                          <td>
                            <div
                              className="ob-meter"
                              data-s={statusMeter}
                              style={{ '--v': pctDisp, '--r': pctRes } as React.CSSProperties}
                            >
                              <i />
                              <em />
                              <b />
                            </div>
                          </td>
                          <td>
                            <span className={`ob-badge ${statusBadge}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {saldosAgrupadosPorMaterial.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-on-surface-variant">
                          Nenhum saldo de estoque registrado para os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ABA 2: LIVRO-RAZAO / KARDEX */}
      {abaAtiva === 'kardex' && (
        <>
          {carregandoKardex ? (
            <p className="text-on-surface-variant p-4">Carregando historico do Livro-Razao...</p>
          ) : (
            <div className="ob-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="ob-table">
                  <thead>
                    <tr>
                      <th>Data / Hora</th>
                      <th>Operacao</th>
                      <th>Material</th>
                      <th className="num">Qtd</th>
                      <th>Obra / Locacao</th>
                      <th>Responsavel</th>
                      <th>Observacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoes.map((m) => {
                      const ehEnt = m.natureza === 'ENTRADA'
                      const isTransf = m.tipo.includes('TRANSF')
                      return (
                        <tr key={m.id}>
                          <td className="ob-mono text-xs text-on-surface-variant whitespace-nowrap">
                            {new Date(m.registradaEm).toLocaleString('pt-BR')}
                          </td>
                          <td>
                            <span
                              className={`ob-badge ${
                                ehEnt
                                  ? 'ob-badge--ok'
                                  : isTransf
                                    ? 'ob-badge--info'
                                    : 'ob-badge--crit'
                              } mr-2`}
                            >
                              {ehEnt ? '+ ENTRADA' : '- SAIDA'}
                            </span>
                            <span className="text-xs text-on-surface-variant font-medium">
                              {LABELS_TIPO_MOVIMENTACAO[m.tipo] || m.tipo}
                            </span>
                          </td>
                          <td>
                            <span className="ob-mono font-medium text-accent-text mr-1.5">
                              {m.material.codigo}
                            </span>
                            <span className="text-on-surface">{m.material.descricao}</span>
                          </td>
                          <td className={`num font-bold ${ehEnt ? 'text-secondary' : 'text-error'}`}>
                            {ehEnt ? '+' : '-'}
                            {m.quantidade} {m.material.unidadeConsumo.sigla}
                          </td>
                          <td className="text-on-surface-variant">
                            <strong className="text-on-surface">{m.local.obra.codigo}</strong> &bull; {m.local.nome}
                            {m.area && (
                              <div className="text-xs text-info font-medium">
                                Destino: {m.area.nome}
                              </div>
                            )}
                          </td>
                          <td className="text-on-surface-variant text-xs">
                            {m.usuario.nome}
                          </td>
                          <td className="text-on-surface-variant text-xs">
                            {m.observacao || '-'}
                          </td>
                        </tr>
                      )
                    })}
                    {movimentacoes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                          Nenhuma movimentacao registrada no Livro-Razao.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ABA 3: LOCACOES DE ESTOQUE */}
      {abaAtiva === 'locais' && (
        <>
          <div className="bg-info-container text-on-info-container border border-info/30 p-4 rounded-xl mb-4 text-sm font-body">
            As locacoes sao subdivisoes fisicas opcionais do almoxarifado da obra (ex: Prateleira A1, Container 02, Patio Externo). Caso nao informe uma locacao ao lancar uma movimentacao, o sistema utilizara automaticamente o <strong>Almoxarifado Geral</strong> da obra.
          </div>

          {erroAcaoLocal && (
            <div className="bg-error-container text-on-error-container border border-error/30 p-4 rounded-xl mb-4 text-sm">
              {erroAcaoLocal}
            </div>
          )}

          {carregandoLocais ? (
            <p className="text-on-surface-variant p-4">Carregando locacoes de estoque...</p>
          ) : (
            <div className="ob-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="ob-table">
                  <thead>
                    <tr>
                      <th>Obra</th>
                      <th>Nome da Locacao / Almoxarifado</th>
                      <th>Itens / Movimentacoes</th>
                      <th>Situacao</th>
                      <th className="text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todosOsLocais.map((loc) => {
                      const semHistorico =
                        (loc._count?.saldos ?? 0) === 0 && (loc._count?.movimentacoes ?? 0) === 0
                      return (
                        <tr key={loc.id}>
                          <td>
                            <strong className="text-accent-text">{loc.obra?.codigo}</strong> - {loc.obra?.nome}
                          </td>
                          <td className="font-medium text-on-surface">
                            {loc.nome}
                          </td>
                          <td className="text-on-surface-variant text-xs font-mono">
                            {loc._count?.saldos ?? 0} materiais &bull; {loc._count?.movimentacoes ?? 0} lancamentos
                          </td>
                          <td>
                            <span className={`ob-badge ${loc.ativo ? 'ob-badge--ok' : ''}`}>
                              {loc.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="text-right">
                            {podeGerenciarLocais && (
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditarLocal(loc)}
                                  className="ob-btn ob-btn--outline ob-btn--sm"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  disabled={toggleLocalMutation.isPending}
                                  onClick={() => toggleLocalMutation.mutate({ id: loc.id, ativo: !loc.ativo })}
                                  className={`ob-btn ob-btn--sm ${loc.ativo ? 'ob-btn--danger' : 'ob-btn--solid'}`}
                                >
                                  {loc.ativo ? 'Desativar' : 'Ativar'}
                                </button>
                                {semHistorico && (
                                  <button
                                    type="button"
                                    disabled={excluirLocalMutation.isPending}
                                    onClick={() => excluirLocalMutation.mutate(loc.id)}
                                    className="ob-btn ob-btn--danger ob-btn--sm"
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
                        <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                          Nenhuma locacao de estoque cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: LANCAR MOVIMENTACAO DE ESTOQUE */}
      {modalMovAberto && (
        <div className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-surface-container-high">
            <h2 className="ob-heading text-lg font-bold text-on-surface mb-1">
              Lancar Movimentacao de Estoque
            </h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Toda movimentacao grava um registro imutavel no Livro-Razao e atualiza o saldo atomicamente.
            </p>

            {erroMov && (
              <div className="bg-error-container text-on-error-container border border-error/30 p-3 rounded-xl mb-4 text-xs font-medium">
                {erroMov}
              </div>
            )}

            <form onSubmit={handleSubmeterMovimentacao} className="flex flex-col gap-4">
              <div>
                <label className="ob-label">Tipo de Operacao</label>
                <select
                  value={movTipo}
                  onChange={(e) => {
                    setMovTipo(e.target.value as TipoMovimentacao)
                    setMovUsarUnidadeCompra(false)
                  }}
                  className="ob-input"
                >
                  {Object.entries(LABELS_TIPO_MOVIMENTACAO).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ob-label">Obra</label>
                  {usuario?.obraId || obras.length === 1 ? (
                    <div className="ob-input py-2.5 px-3 bg-surface-container text-on-surface font-semibold flex items-center justify-between">
                      <span>
                        {usuario?.obra
                          ? `${usuario.obra.codigo} - ${usuario.obra.nome}`
                          : obras[0]
                            ? `${obras[0].codigo} - ${obras[0].nome}`
                            : 'Obra'}
                      </span>
                      <span className="text-xs text-secondary font-normal">(Fixa)</span>
                    </div>
                  ) : (
                    <select
                      value={movObraId}
                      onChange={(e) => {
                        setMovObraId(e.target.value)
                        setMovLocalId('')
                        setMovAreaId('')
                      }}
                      required
                      className="ob-input"
                    >
                      <option value="">Selecione a obra...</option>
                      {obras.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.codigo} - {o.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="ob-label">Locacao do Estoque (opcional)</label>
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
                    className="ob-input"
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
                <label className="ob-label">Material</label>
                <select
                  value={movMaterialId}
                  onChange={(e) => {
                    setMovMaterialId(e.target.value)
                    setMovUsarUnidadeCompra(false)
                  }}
                  required
                  className="ob-input"
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
                <div className="bg-accent/10 border border-accent-text/30 p-3.5 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-accent-text">
                    <input
                      type="checkbox"
                      checked={movUsarUnidadeCompra}
                      onChange={(e) => setMovUsarUnidadeCompra(e.target.checked)}
                      className="accent-primary"
                    />
                    Converter entrada pela Unidade de Compra ({materialSelecionadoNoModal.unidadeCompra?.sigla})
                  </label>
                  <div className="text-xs text-on-surface-variant mt-1.5 font-mono">
                    Fator configurado: 1 {materialSelecionadoNoModal.unidadeCompra?.sigla} ={' '}
                    {Number(materialSelecionadoNoModal.fatorConversao)} {materialSelecionadoNoModal.unidadeConsumo.sigla}.
                    {movUsarUnidadeCompra && (
                      <strong className="block text-accent-text mt-1">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ob-label">
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
                    className="ob-input ob-mono"
                  />
                </div>

                <div>
                  <label className="ob-label">Area / Pavimento (opcional)</label>
                  <select
                    value={movAreaId}
                    onChange={(e) => setMovAreaId(e.target.value)}
                    disabled={!movObraId}
                    className="ob-input disabled:opacity-50"
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
                <label className="ob-label">Observacao / Documento (opcional)</label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder="ex: Nota Fiscal 4590 ou ajuste de conferencia"
                  value={movObservacao}
                  onChange={(e) => setMovObservacao(e.target.value)}
                  className="ob-input"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setModalMovAberto(false)}
                  className="ob-btn ob-btn--outline ob-btn--sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registrarMovMutation.isPending}
                  className="ob-btn ob-btn--primary ob-btn--sm"
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
        <div className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-surface-container-high">
            <h2 className="ob-heading text-lg font-bold text-on-surface mb-2">
              {localEditando ? 'Editar Locacao de Estoque' : 'Cadastrar Nova Locacao de Estoque'}
            </h2>

            {erroLocal && (
              <div className="bg-error-container text-on-error-container border border-error/30 p-3 rounded-xl mb-4 text-xs font-medium">
                {erroLocal}
              </div>
            )}

            <form onSubmit={handleSubmeterLocal} className="flex flex-col gap-4">
              <div>
                <label className="ob-label">Obra Vinculada</label>
                {usuario?.obraId || obras.length === 1 ? (
                  <div className="ob-input py-2.5 px-3 bg-surface-container text-on-surface font-semibold flex items-center justify-between">
                    <span>
                      {usuario?.obra
                        ? `${usuario.obra.codigo} - ${usuario.obra.nome}`
                        : obras[0]
                          ? `${obras[0].codigo} - ${obras[0].nome}`
                          : 'Obra'}
                    </span>
                    <span className="text-xs text-secondary font-normal">(Fixa)</span>
                  </div>
                ) : (
                  <select
                    value={localObraId}
                    onChange={(e) => setLocalObraId(e.target.value)}
                    required
                    disabled={!!localEditando}
                    className="ob-input disabled:opacity-50"
                  >
                    <option value="">Selecione a obra...</option>
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.codigo} - {o.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="ob-label">Nome da Locacao / Prateleira / Container</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Locacao 01 - Prateleira A"
                  value={localNome}
                  onChange={(e) => setLocalNome(e.target.value)}
                  className="ob-input"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalLocalAberto(false)
                    setLocalEditando(null)
                  }}
                  className="ob-btn ob-btn--outline ob-btn--sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarLocalMutation.isPending || editarLocalMutation.isPending}
                  className="ob-btn ob-btn--primary ob-btn--sm"
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
