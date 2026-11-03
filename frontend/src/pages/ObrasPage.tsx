import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAreaObra,
  createObra,
  deleteAreaObra,
  getAreasObra,
  getObras,
  toggleAreaSituacao,
  toggleObraSituacao,
  updateAreaObra,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { AreaObra } from '../types/obra'

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

export function ObrasPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  const podeGerenciarObras = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'ADMINISTRACAO'
  const podeGerenciarAreas = usuario?.perfil === 'ADMIN' || usuario?.perfil === 'ENGENHARIA'

  const [obraSelecionadaId, setObraSelecionadaId] = useState<string>('')
  const [buscaArea, setBuscaArea] = useState('')

  // Modais
  const [modalNovaObraAberto, setModalNovaObraAberto] = useState(false)
  const [modalNovaAreaAberto, setModalNovaAreaAberto] = useState(false)
  const [modalEditarAreaAberto, setModalEditarAreaAberto] = useState(false)

  // Formulario Nova Obra
  const [novoCodigoObra, setNovoCodigoObra] = useState('')
  const [novoNomeObra, setNovoNomeObra] = useState('')
  const [novaCidadeObra, setNovaCidadeObra] = useState('')
  const [erroObra, setErroObra] = useState<string | null>(null)

  // Formulario Nova Area
  const [novoNomeArea, setNovoNomeArea] = useState('')
  const [novaOrdemArea, setNovaOrdemArea] = useState<number>(0)
  const [erroArea, setErroArea] = useState<string | null>(null)

  // Formulario Edicao Area
  const [areaParaEditar, setAreaParaEditar] = useState<AreaObra | null>(null)
  const [editarNomeArea, setEditarNomeArea] = useState('')
  const [editarOrdemArea, setEditarOrdemArea] = useState<number>(0)
  const [erroEdicaoArea, setErroEdicaoArea] = useState<string | null>(null)

  // Mensagem de erro geral para exclusao
  const [erroExclusaoArea, setErroExclusaoArea] = useState<string | null>(null)

  // Queries
  const { data: obras = [], isLoading: carregandoObras } = useQuery({
    queryKey: ['obras'],
    queryFn: () => getObras(false),
  })

  // Se nao houver obra selecionada, seleciona a primeira por padrao
  const obraAtual = obras.find((o) => o.id === obraSelecionadaId) || obras[0]
  const obraIdAtiva = obraAtual?.id

  const { data: areas = [], isLoading: carregandoAreas } = useQuery({
    queryKey: ['areas', obraIdAtiva],
    queryFn: () => (obraIdAtiva ? getAreasObra(obraIdAtiva, false) : Promise.resolve([])),
    enabled: Boolean(obraIdAtiva),
  })

  // Mutations
  const criarObraMutation = useMutation({
    mutationFn: createObra,
    onSuccess: (obraCriada) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      setObraSelecionadaId(obraCriada.id)
      setModalNovaObraAberto(false)
      setNovoCodigoObra('')
      setNovoNomeObra('')
      setNovaCidadeObra('')
      setErroObra(null)
    },
    onError: (err: any) => {
      setErroObra(extrairErro(err, 'Erro ao cadastrar obra'))
    },
  })

  const toggleObraMutation = useMutation({
    mutationFn: ({ id, ativa }: { id: string; ativa: boolean }) =>
      toggleObraSituacao(id, ativa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
    },
  })

  const criarAreaMutation = useMutation({
    mutationFn: (dados: { nome: string; ordem?: number }) =>
      createAreaObra(obraIdAtiva!, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', obraIdAtiva] })
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      setModalNovaAreaAberto(false)
      setNovoNomeArea('')
      setNovaOrdemArea(0)
      setErroArea(null)
    },
    onError: (err: any) => {
      setErroArea(extrairErro(err, 'Erro ao cadastrar area'))
    },
  })

  const editarAreaMutation = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: { nome?: string; ordem?: number } }) =>
      updateAreaObra(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', obraIdAtiva] })
      setModalEditarAreaAberto(false)
      setAreaParaEditar(null)
      setErroEdicaoArea(null)
    },
    onError: (err: any) => {
      setErroEdicaoArea(extrairErro(err, 'Erro ao atualizar area'))
    },
  })

  const toggleAreaMutation = useMutation({
    mutationFn: ({ id, ativa }: { id: string; ativa: boolean }) =>
      toggleAreaSituacao(id, ativa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', obraIdAtiva] })
    },
  })

  const excluirAreaMutation = useMutation({
    mutationFn: (id: string) => deleteAreaObra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', obraIdAtiva] })
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      setErroExclusaoArea(null)
    },
    onError: (err: any) => {
      setErroExclusaoArea(extrairErro(err, 'Nao e possivel excluir esta area pois existem registros vinculados'))
    },
  })

  function handleCriarObra(e: FormEvent) {
    e.preventDefault()
    setErroObra(null)
    criarObraMutation.mutate({
      codigo: novoCodigoObra.trim(),
      nome: novoNomeObra.trim(),
      cidade: novaCidadeObra.trim(),
    })
  }

  function handleCriarArea(e: FormEvent) {
    e.preventDefault()
    if (!obraIdAtiva) return
    setErroArea(null)
    criarAreaMutation.mutate({
      nome: novoNomeArea.trim(),
      ordem: Number(novaOrdemArea),
    })
  }

  function abrirModalEditar(area: AreaObra) {
    setAreaParaEditar(area)
    setEditarNomeArea(area.nome)
    setEditarOrdemArea(area.ordem)
    setErroEdicaoArea(null)
    setModalEditarAreaAberto(true)
  }

  function handleEditarArea(e: FormEvent) {
    e.preventDefault()
    if (!areaParaEditar) return
    setErroEdicaoArea(null)
    editarAreaMutation.mutate({
      id: areaParaEditar.id,
      dados: {
        nome: editarNomeArea.trim(),
        ordem: Number(editarOrdemArea),
      },
    })
  }

  function handleConfirmarExclusao(area: AreaObra) {
    setErroExclusaoArea(null)
    const confirmou = window.confirm(
      `Deseja realmente excluir a area "${area.nome}"? Esta acao so sera permitida se nao houver materiais ou requisicoes vinculadas a ela.`
    )
    if (confirmou) {
      excluirAreaMutation.mutate(area.id)
    }
  }

  const areasFiltradas = areas.filter((a) =>
    a.nome.toLowerCase().includes(buscaArea.toLowerCase())
  )

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 pb-24 font-body text-on-surface">
      {/* Cabecalho da Pagina */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="ob-heading text-2xl sm:text-3xl font-bold text-on-surface tracking-tight m-0">
            Obras e Pavimentos
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-body mt-1">
            Estrutura da obra e organizacao por setores/pavimentos para controle de materiais
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {podeGerenciarObras && (
            <button
              type="button"
              onClick={() => {
                setNovoCodigoObra('')
                setNovoNomeObra('')
                setNovaCidadeObra('')
                setErroObra(null)
                setModalNovaObraAberto(true)
              }}
              className="ob-btn ob-btn--outline ob-btn--sm min-h-[44px]"
            >
              + Nova Obra
            </button>
          )}

          {podeGerenciarAreas && obraAtual && (
            <button
              type="button"
              onClick={() => {
                setNovoNomeArea('')
                setNovaOrdemArea(areas.length > 0 ? Math.max(...areas.map((a) => a.ordem)) + 1 : 0)
                setErroArea(null)
                setModalNovaAreaAberto(true)
              }}
              className="ob-btn ob-btn--primary ob-btn--sm min-h-[44px]"
            >
              + Nova Area
            </button>
          )}
        </div>
      </div>

      {erroExclusaoArea && (
        <div
          role="alert"
          className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-6 text-sm animate-fade-up"
        >
          {erroExclusaoArea}
        </div>
      )}

      {carregandoObras ? (
        <p className="text-sm text-on-surface-variant">Carregando dados das obras...</p>
      ) : obras.length === 0 ? (
        <div className="ob-card p-8 text-center text-sm text-on-surface-variant border border-dashed border-surface-container">
          Nenhuma obra cadastrada no sistema.
        </div>
      ) : (
        <>
          {/* Cartao Informativo da Obra Ativa */}
          <div className="ob-card p-6 mb-8 shadow-sm">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="ob-mono font-semibold text-accent-text text-base">
                    {obraAtual.codigo}
                  </span>
                  <h2 className="ob-heading text-2xl font-bold text-on-surface m-0">
                    {obraAtual.nome}
                  </h2>
                  <span
                    className={`ob-badge ${
                      obraAtual.ativa ? 'ob-badge--ok' : 'ob-badge--crit'
                    }`}
                  >
                    {obraAtual.ativa ? 'Obra Ativa' : 'Obra Inativa'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant m-0 font-body">
                  Cidade: <strong className="text-on-surface">{obraAtual.cidade}</strong> | Total de Áreas/Pavimentos:{' '}
                  <strong className="text-on-surface font-mono tabular-nums">{areas.length}</strong>
                </p>
              </div>

              {/* Seletor caso haja mais de uma obra */}
              {obras.length > 1 && (
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1 font-body">
                    Alternar Empreendimento:
                  </label>
                  <select
                    value={obraAtual.id}
                    onChange={(e) => setObraSelecionadaId(e.target.value)}
                    className="ob-input text-sm py-2 px-3"
                  >
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.codigo} - {o.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {podeGerenciarObras && (
                <button
                  type="button"
                  disabled={toggleObraMutation.isPending}
                  onClick={() => toggleObraMutation.mutate({ id: obraAtual.id, ativa: !obraAtual.ativa })}
                  className="ob-btn ob-btn--outline ob-btn--sm text-error border-error/30 hover:bg-error-container/20"
                >
                  {obraAtual.ativa ? 'Desativar Obra' : 'Reativar Obra'}
                </button>
              )}
            </div>
          </div>

          {/* Secao de Gestao de Areas */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <div>
              <h3 className="ob-heading text-base font-bold text-on-surface m-0">
                Pavimentos e Setores da Obra
              </h3>
              <p className="text-xs text-on-surface-variant m-0 font-body">
                {podeGerenciarAreas
                  ? 'Engenharia e Administracao possuem permissao para cadastrar, editar e gerenciar areas'
                  : 'Visualizacao restrita aos dados cadastrados'}
              </p>
            </div>

            <div className="ob-search flex-1 max-w-sm">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Buscar por nome da area ou pavimento..."
                value={buscaArea}
                onChange={(e) => setBuscaArea(e.target.value)}
                className="ob-input text-xs sm:text-sm"
              />
            </div>
          </div>

          {carregandoAreas ? (
            <p className="text-sm text-on-surface-variant">Carregando areas da obra...</p>
          ) : (
            <div className="ob-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="ob-table">
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Ordem</th>
                      <th>Nome da Area / Pavimento</th>
                      <th>Situacao</th>
                      <th>Cadastrada Em</th>
                      {podeGerenciarAreas && <th style={{ textAlign: 'right' }}>Acoes</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {areasFiltradas.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="ob-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-container text-on-surface">
                            {a.ordem}
                          </span>
                        </td>
                        <td className="font-medium text-on-surface">
                          {a.nome}
                        </td>
                        <td>
                          <span
                            className={`ob-badge ${
                              a.ativa ? 'ob-badge--ok' : 'ob-badge--crit'
                            }`}
                          >
                            {a.ativa ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="text-on-surface-variant font-mono tabular-nums text-xs">
                          {new Date(a.criadaEm).toLocaleDateString('pt-BR')}
                        </td>
                        {podeGerenciarAreas && (
                          <td style={{ textAlign: 'right' }}>
                            <div className="inline-flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => abrirModalEditar(a)}
                                className="ob-btn ob-btn--outline ob-btn--sm"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                disabled={toggleAreaMutation.isPending}
                                onClick={() => toggleAreaMutation.mutate({ id: a.id, ativa: !a.ativa })}
                                className="ob-btn ob-btn--outline ob-btn--sm"
                              >
                                {a.ativa ? 'Desativar' : 'Ativar'}
                              </button>

                              <button
                                type="button"
                                disabled={excluirAreaMutation.isPending}
                                onClick={() => handleConfirmarExclusao(a)}
                                className="ob-btn ob-btn--outline ob-btn--sm text-error border-error/30 hover:bg-error-container/20"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {areasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan={podeGerenciarAreas ? 5 : 4} className="p-8 text-center text-on-surface-variant font-body">
                          Nenhuma area cadastrada ou encontrada para esta obra.
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

      {/* Modal: Nova Obra */}
      {modalNovaObraAberto && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h2 className="ob-heading text-xl font-bold text-on-surface mb-4">
              Cadastrar Nova Obra
            </h2>

            {erroObra && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-4 text-sm">
                {erroObra}
              </div>
            )}

            <form onSubmit={handleCriarObra} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Codigo Interno (imutavel)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: JOOY-02"
                  value={novoCodigoObra}
                  onChange={(e) => setNovoCodigoObra(e.target.value)}
                  className="ob-input w-full font-mono uppercase text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Nome do Empreendimento / Condominio
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Residencial Jooy Horizonte"
                  value={novoNomeObra}
                  onChange={(e) => setNovoNomeObra(e.target.value)}
                  className="ob-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Cidade
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Campo Grande"
                  value={novaCidadeObra}
                  onChange={(e) => setNovaCidadeObra(e.target.value)}
                  className="ob-input w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNovaObraAberto(false)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarObraMutation.isPending}
                  className="ob-btn ob-btn--primary"
                >
                  {criarObraMutation.isPending ? 'Cadastrando...' : 'Cadastrar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Area da Obra */}
      {modalNovaAreaAberto && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h2 className="ob-heading text-xl font-bold text-on-surface mb-1">
              Cadastrar Nova Area
            </h2>
            <p className="text-xs text-on-surface-variant mb-4 font-body">
              Obra: <strong className="text-on-surface">{obraAtual?.nome}</strong>
            </p>

            {erroArea && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-4 text-sm">
                {erroArea}
              </div>
            )}

            <form onSubmit={handleCriarArea} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Nome da Area / Pavimento
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 4o Pavimento ou Garagem"
                  value={novoNomeArea}
                  onChange={(e) => setNovoNomeArea(e.target.value)}
                  className="ob-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Ordem de Exibicao (Negativo = Subsolo, 0 = Terreo)
                </label>
                <input
                  type="number"
                  required
                  value={novaOrdemArea}
                  onChange={(e) => setNovaOrdemArea(Number(e.target.value))}
                  className="ob-input w-full font-mono tabular-nums text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNovaAreaAberto(false)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarAreaMutation.isPending}
                  className="ob-btn ob-btn--primary"
                >
                  {criarAreaMutation.isPending ? 'Salvando...' : 'Salvar Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Area da Obra */}
      {modalEditarAreaAberto && areaParaEditar && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h2 className="ob-heading text-xl font-bold text-on-surface mb-1">
              Editar Area / Pavimento
            </h2>
            <p className="text-xs text-on-surface-variant mb-4 font-body">
              Obra: <strong className="text-on-surface">{obraAtual?.nome}</strong>
            </p>

            {erroEdicaoArea && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-4 text-sm">
                {erroEdicaoArea}
              </div>
            )}

            <form onSubmit={handleEditarArea} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Nome da Area / Pavimento
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 1o Pavimento Torre A"
                  value={editarNomeArea}
                  onChange={(e) => setEditarNomeArea(e.target.value)}
                  className="ob-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Ordem de Exibicao
                </label>
                <input
                  type="number"
                  required
                  value={editarOrdemArea}
                  onChange={(e) => setEditarOrdemArea(Number(e.target.value))}
                  className="ob-input w-full font-mono tabular-nums text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarAreaAberto(false)
                    setAreaParaEditar(null)
                  }}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editarAreaMutation.isPending}
                  className="ob-btn ob-btn--primary"
                >
                  {editarAreaMutation.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
