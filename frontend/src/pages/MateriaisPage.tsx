import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMateriais,
  getUnidadesMedida,
  getCategoriasMaterial,
  createMaterial,
  updateMaterial,
  toggleMaterialSituacao,
  createCategoriaMaterial,
  updateCategoriaMaterial,
  deleteCategoriaMaterial,
  createUnidadeMedida,
  updateUnidadeMedida,
  deleteUnidadeMedida,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Material, CategoriaMaterial, UnidadeMedida } from '../types/material'

export function MateriaisPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  // Permissoes: Admin, Engenharia e Almoxarife podem cadastrar/editar
  const podeGerenciar =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ENGENHARIA' ||
    usuario?.perfil === 'ALMOXARIFE'

  // Estados de Filtro
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [somenteAtivos, setSomenteAtivos] = useState(true)

  // Estados dos Modais de Material
  const [modalMaterialAberto, setModalMaterialAberto] = useState(false)
  const [materialEmEdicao, setMaterialEmEdicao] = useState<Material | null>(null)

  // Estados do Gerenciador de Categorias
  const [modalGerenciarCategorias, setModalGerenciarCategorias] = useState(false)
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<CategoriaMaterial | null>(null)
  const [nomeCategoriaInput, setNomeCategoriaInput] = useState('')

  // Estados do Gerenciador de Unidades
  const [modalGerenciarUnidades, setModalGerenciarUnidades] = useState(false)
  const [unidadeEmEdicao, setUnidadeEmEdicao] = useState<UnidadeMedida | null>(null)
  const [siglaUnidadeInput, setSiglaUnidadeInput] = useState('')
  const [descricaoUnidadeInput, setDescricaoUnidadeInput] = useState('')

  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  // Form de Material
  const [formCodigo, setFormCodigo] = useState('')
  const [formCodigoSienge, setFormCodigoSienge] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formCategoriaId, setFormCategoriaId] = useState('')
  const [formUnConsumoId, setFormUnConsumoId] = useState('')
  // Conversao opcional
  const [temConversao, setTemConversao] = useState(false)
  const [formUnCompraId, setFormUnCompraId] = useState('')
  const [formFatorConversao, setFormFatorConversao] = useState('1')
  const [formEhKit, setFormEhKit] = useState(false)
  const [formExigeTeste, setFormExigeTeste] = useState(false)

  // Queries
  const { data: materiais = [], isLoading: carregandoMateriais } = useQuery({
    queryKey: ['materiais', busca, categoriaFiltro, somenteAtivos],
    queryFn: () =>
      getMateriais({
        busca: busca.trim() || undefined,
        categoriaId: categoriaFiltro || undefined,
        somenteAtivos,
      }),
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-medida'],
    queryFn: getUnidadesMedida,
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-material'],
    queryFn: getCategoriasMaterial,
  })

  // Mutations de Material
  const criarMaterialMutation = useMutation({
    mutationFn: createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] })
      queryClient.invalidateQueries({ queryKey: ['categorias-material'] })
      fecharModalMaterial()
      setMensagemSucesso('Material cadastrado com sucesso no catalogo.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao cadastrar material.')
    },
  })

  const atualizarMaterialMutation = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: any }) => updateMaterial(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      fecharModalMaterial()
      setMensagemSucesso('Material atualizado com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao atualizar material.')
    },
  })

  const toggleSituacaoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      toggleMaterialSituacao(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      setMensagemSucesso('Situacao do material alterada com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao alterar situacao do material.')
    },
  })

  // Mutations de Categorias
  const salvarCategoriaMutation = useMutation({
    mutationFn: async () => {
      if (categoriaEmEdicao) {
        return updateCategoriaMaterial(categoriaEmEdicao.id, { nome: nomeCategoriaInput.trim() })
      }
      return createCategoriaMaterial({ nome: nomeCategoriaInput.trim() })
    },
    onSuccess: (categoriaSalva) => {
      queryClient.invalidateQueries({ queryKey: ['categorias-material'] })
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      if (categoriaSalva?.id) {
        setFormCategoriaId(categoriaSalva.id)
      }
      setCategoriaEmEdicao(null)
      setNomeCategoriaInput('')
      setMensagemErro(null)
      setMensagemSucesso('Categoria salva com sucesso.')
    },
    onError: (err: any) => {
      setMensagemSucesso(null)
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao salvar categoria.')
    },
  })

  const excluirCategoriaMutation = useMutation({
    mutationFn: deleteCategoriaMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-material'] })
      setMensagemErro(null)
      setMensagemSucesso('Categoria excluida com sucesso.')
    },
    onError: (err: any) => {
      setMensagemSucesso(null)
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao excluir categoria.')
    },
  })

  // Mutations de Unidades
  const salvarUnidadeMutation = useMutation({
    mutationFn: async () => {
      if (unidadeEmEdicao) {
        return updateUnidadeMedida(unidadeEmEdicao.id, {
          descricao: descricaoUnidadeInput.trim(),
        })
      }
      return createUnidadeMedida({
        sigla: siglaUnidadeInput.trim().toUpperCase(),
        descricao: descricaoUnidadeInput.trim(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] })
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      setUnidadeEmEdicao(null)
      setSiglaUnidadeInput('')
      setDescricaoUnidadeInput('')
      setMensagemErro(null)
      setMensagemSucesso('Unidade de medida salva com sucesso.')
    },
    onError: (err: any) => {
      setMensagemSucesso(null)
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao salvar unidade.')
    },
  })

  const excluirUnidadeMutation = useMutation({
    mutationFn: deleteUnidadeMedida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] })
      setMensagemErro(null)
      setMensagemSucesso('Unidade de medida excluida com sucesso.')
    },
    onError: (err: any) => {
      setMensagemSucesso(null)
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao excluir unidade.')
    },
  })

  function abrirModalCriacao() {
    setMaterialEmEdicao(null)
    setFormCodigo('')
    setFormCodigoSienge('')
    setFormDescricao('')
    setFormCategoriaId(categorias[0]?.id || '')
    setFormUnConsumoId(unidades[0]?.id || '')
    setTemConversao(false)
    setFormUnCompraId('')
    setFormFatorConversao('1')
    setFormEhKit(false)
    setFormExigeTeste(false)
    setMensagemErro(null)
    setMensagemSucesso(null)
    setModalMaterialAberto(true)
  }

  function abrirModalEdicao(mat: Material) {
    setMaterialEmEdicao(mat)
    setFormCodigo(mat.codigo)
    setFormCodigoSienge(mat.codigoSienge || '')
    setFormDescricao(mat.descricao)
    setFormCategoriaId(mat.categoriaId)
    setFormUnConsumoId(mat.unidadeConsumoId)
    const possuiConversao = Boolean(mat.unidadeCompraId && mat.unidadeCompraId !== mat.unidadeConsumoId)
    setTemConversao(possuiConversao)
    setFormUnCompraId(mat.unidadeCompraId || '')
    setFormFatorConversao(String(mat.fatorConversao || 1))
    setFormEhKit(mat.ehKit)
    setFormExigeTeste(mat.exigeTesteQualidade)
    setMensagemErro(null)
    setMensagemSucesso(null)
    setModalMaterialAberto(true)
  }

  function fecharModalMaterial() {
    setModalMaterialAberto(false)
    setMaterialEmEdicao(null)
  }

  function handleSalvarMaterial(e: React.FormEvent) {
    e.preventDefault()
    setMensagemErro(null)
    setMensagemSucesso(null)

    let fatorNum = 1.0
    let unCompraFinal: string | null = null

    if (temConversao) {
      if (!formUnCompraId) {
        setMensagemErro('Selecione a unidade de compra para a conversao.')
        return
      }
      fatorNum = Number(formFatorConversao)
      if (isNaN(fatorNum) || fatorNum <= 0) {
        setMensagemErro('O fator de conversao deve ser um numero positivo maior que zero.')
        return
      }
      unCompraFinal = formUnCompraId
    }

    const codigoSiengeFormatado = formCodigoSienge.trim() || null

    if (materialEmEdicao) {
      atualizarMaterialMutation.mutate({
        id: materialEmEdicao.id,
        dados: {
          codigo: formCodigo.trim().toUpperCase(),
          codigoSienge: codigoSiengeFormatado,
          descricao: formDescricao.trim(),
          categoriaId: formCategoriaId,
          unidadeConsumoId: formUnConsumoId,
          unidadeCompraId: unCompraFinal,
          fatorConversao: fatorNum,
          ehKit: formEhKit,
          exigeTesteQualidade: formExigeTeste,
        },
      })
    } else {
      criarMaterialMutation.mutate({
        codigo: formCodigo.trim().toUpperCase(),
        codigoSienge: codigoSiengeFormatado,
        descricao: formDescricao.trim(),
        categoriaId: formCategoriaId,
        unidadeConsumoId: formUnConsumoId,
        unidadeCompraId: unCompraFinal,
        fatorConversao: fatorNum,
        ehKit: formEhKit,
        exigeTesteQualidade: formExigeTeste,
      })
    }
  }

  const unConsumoObj = unidades.find((u) => u.id === formUnConsumoId)
  const unCompraObj = unidades.find((u) => u.id === formUnCompraId)

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 pb-24 font-body text-on-surface">
      {/* Cabecalho da Pagina */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">
            Catálogo de Materiais
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Controle de insumos, unidades de medida e taxas opcionais de conversão de compra.
          </p>
        </div>

        {podeGerenciar && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCategoriaEmEdicao(null)
                setNomeCategoriaInput('')
                setMensagemErro(null)
                setModalGerenciarCategorias(true)
              }}
              className="ob-btn ob-btn--outline text-sm"
            >
              Gerenciar Categorias
            </button>
            <button
              type="button"
              onClick={() => {
                setUnidadeEmEdicao(null)
                setSiglaUnidadeInput('')
                setDescricaoUnidadeInput('')
                setMensagemErro(null)
                setModalGerenciarUnidades(true)
              }}
              className="ob-btn ob-btn--outline text-sm"
            >
              Gerenciar Unidades
            </button>
            <button
              type="button"
              onClick={abrirModalCriacao}
              className="ob-btn ob-btn--primary text-sm font-semibold"
            >
              + Cadastrar Material
            </button>
          </div>
        )}
      </div>

      {/* Alertas */}
      {mensagemSucesso && (
        <div
          role="status"
          className="p-4 mb-4 rounded-xl bg-secondary-container text-on-secondary-container border border-secondary text-sm"
        >
          {mensagemSucesso}
        </div>
      )}

      {mensagemErro && (
        <div
          role="alert"
          className="p-4 mb-4 rounded-xl bg-error-container text-on-error-container border border-error text-sm"
        >
          {mensagemErro}
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="ob-card p-4 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label
            htmlFor="filtro-busca"
            className="ob-label"
          >
            Buscar Insumo
          </label>
          <input
            id="filtro-busca"
            type="text"
            placeholder="Nome, código interno ou código Sienge..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="ob-input w-full"
          />
        </div>

        <div>
          <label
            htmlFor="filtro-categoria"
            className="ob-label"
          >
            Categoria
          </label>
          <select
            id="filtro-categoria"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="ob-input w-full bg-surface"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <input
            id="filtro-somente-ativos"
            type="checkbox"
            checked={somenteAtivos}
            onChange={(e) => setSomenteAtivos(e.target.checked)}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
          <label
            htmlFor="filtro-somente-ativos"
            className="text-sm text-on-surface cursor-pointer select-none"
          >
            Exibir somente materiais ativos
          </label>
        </div>
      </div>

      {/* Tabela de Materiais */}
      <div className="ob-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ob-table w-full">
            <thead>
              <tr>
                <th className="font-semibold text-xs uppercase tracking-wider">
                  Código Interno
                </th>
                <th className="font-semibold text-xs uppercase tracking-wider">
                  Cód. Sienge
                </th>
                <th className="font-semibold text-xs uppercase tracking-wider">
                  Descrição / Insumo
                </th>
                <th className="font-semibold text-xs uppercase tracking-wider">
                  Categoria
                </th>
                <th className="font-semibold text-xs uppercase tracking-wider">
                  Unidade Padrão
                </th>
                <th className="font-semibold text-xs uppercase tracking-wider">
                  Conversão de Compra
                </th>
                <th className="font-semibold text-xs uppercase tracking-wider">
                  Situação
                </th>
                {podeGerenciar && (
                  <th className="font-semibold text-xs uppercase tracking-wider text-right">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {carregandoMateriais ? (
                <tr>
                  <td colSpan={podeGerenciar ? 8 : 7} className="p-8 text-center text-on-surface-variant">
                    Carregando catálogo de materiais...
                  </td>
                </tr>
              ) : materiais.length === 0 ? (
                <tr>
                  <td colSpan={podeGerenciar ? 8 : 7} className="p-8 text-center text-on-surface-variant">
                    Nenhum material encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                materiais.map((mat) => {
                  const fatorNum = Number(mat.fatorConversao || 1)
                  const possuiConversaoAtiva =
                    Boolean(mat.unidadeCompraId && mat.unidadeCompraId !== mat.unidadeConsumoId)

                  return (
                    <tr
                      key={mat.id}
                      className={mat.ativo ? '' : 'opacity-60'}
                    >
                      <td className="font-mono font-bold text-on-surface whitespace-nowrap">
                        {mat.codigo}
                      </td>
                      <td className="font-mono text-xs text-on-surface-variant whitespace-nowrap">
                        {mat.codigoSienge ? (
                          <span className="ob-badge ob-badge--info font-mono text-[11px] py-0.5 px-2">
                            {mat.codigoSienge}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/50">-</span>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold text-on-surface">
                          {mat.descricao}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {mat.exigeTesteQualidade && (
                            <span className="ob-badge ob-badge--low text-xs">
                              Exige Teste de Qualidade
                            </span>
                          )}
                          {mat.ehKit && (
                            <span className="ob-badge ob-badge--info text-xs">
                              Kit de Materiais
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-on-surface-variant">
                        {mat.categoria?.nome || '-'}
                      </td>
                      <td className="font-semibold text-on-surface">
                        {mat.unidadeConsumo?.sigla} ({mat.unidadeConsumo?.descricao})
                      </td>
                      <td>
                        {possuiConversaoAtiva ? (
                          <span className="font-mono font-semibold text-accent-text dark:text-primary">
                            1 {mat.unidadeCompra?.sigla} = {fatorNum} {mat.unidadeConsumo?.sigla}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">Direta (1:1)</span>
                        )}
                      </td>
                      <td>
                        {mat.ativo ? (
                          <span className="ob-badge ob-badge--ok">
                            Ativo
                          </span>
                        ) : (
                          <span className="ob-badge">
                            Inativo
                          </span>
                        )}
                      </td>
                      {podeGerenciar && (
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirModalEdicao(mat)}
                              className="ob-btn ob-btn--outline text-xs py-1 px-3"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleSituacaoMutation.mutate({ id: mat.id, ativo: !mat.ativo })
                              }
                              className={`ob-btn text-xs py-1 px-3 border ${
                                mat.ativo
                                  ? 'border-error text-error hover:bg-error-container'
                                  : 'border-secondary text-secondary hover:bg-secondary-container'
                              }`}
                            >
                              {mat.ativo ? 'Desativar' : 'Reativar'}
                            </button>
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

      {/* Modal de Cadastro / Edição de Material */}
      {modalMaterialAberto && (
        <div className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest text-on-surface rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-outline-variant">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-on-surface">
                {materialEmEdicao ? `Editar Insumo (${materialEmEdicao.codigo})` : 'Novo Insumo'}
              </h2>
              <button
                type="button"
                onClick={fecharModalMaterial}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSalvarMaterial} className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="material-codigo"
                    className="ob-label"
                  >
                    Código Interno (Jooy) *
                  </label>
                  <input
                    id="material-codigo"
                    type="text"
                    required
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                    placeholder="Ex: MAT-001 ou CIM-01"
                    className="ob-input w-full font-mono"
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1">Identificador padrão da obra e almoxarifado</p>
                </div>

                <div>
                  <label
                    htmlFor="material-codigo-sienge"
                    className="ob-label flex items-center justify-between"
                  >
                    <span>Código SIENGE / ERP</span>
                    <span className="text-xs text-on-surface-variant font-normal">(Opcional)</span>
                  </label>
                  <input
                    id="material-codigo-sienge"
                    type="text"
                    value={formCodigoSienge}
                    onChange={(e) => setFormCodigoSienge(e.target.value)}
                    placeholder="Ex: 74201 ou em branco"
                    className="ob-input w-full font-mono"
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1">Pode ser cadastrado depois quando integrado ao ERP</p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="material-descricao"
                  className="ob-label"
                >
                  Descrição Completa *
                </label>
                <input
                  id="material-descricao"
                  type="text"
                  required
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Ex: Cimento CP-II F 32 50kg"
                  className="ob-input w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="material-categoria"
                      className="ob-label mb-0"
                    >
                      Categoria *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriaEmEdicao(null)
                        setNomeCategoriaInput('')
                        setMensagemErro(null)
                        setMensagemSucesso(null)
                        setModalGerenciarCategorias(true)
                      }}
                      className="text-xs font-semibold text-accent-text dark:text-primary hover:underline"
                    >
                      + Nova categoria
                    </button>
                  </div>
                  <select
                    id="material-categoria"
                    required
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(e.target.value)}
                    className="ob-input w-full bg-surface"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="material-un-consumo"
                    className="ob-label"
                  >
                    Unidade Padrão de Estoque/Uso *
                  </label>
                  <select
                    id="material-un-consumo"
                    required
                    value={formUnConsumoId}
                    onChange={(e) => setFormUnConsumoId(e.target.value)}
                    className="ob-input w-full bg-surface"
                  >
                    <option value="">Selecione a unidade...</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.sigla} - {u.descricao}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conversão Opcional de Unidade de Compra */}
              <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low grid gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={temConversao}
                    onChange={(e) => {
                      setTemConversao(e.target.checked)
                      if (!e.target.checked) {
                        setFormUnCompraId('')
                        setFormFatorConversao('1')
                      }
                    }}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-semibold text-on-surface">
                    Material possui unidade de compra diferente (com taxa de conversão)?
                  </span>
                </label>

                {temConversao && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label
                        htmlFor="material-un-compra"
                        className="ob-label"
                      >
                        Unidade de Compra *
                      </label>
                      <select
                        id="material-un-compra"
                        required={temConversao}
                        value={formUnCompraId}
                        onChange={(e) => setFormUnCompraId(e.target.value)}
                        className="ob-input w-full bg-surface"
                      >
                        <option value="">Selecione a unidade de compra...</option>
                        {unidades.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.sigla} - {u.descricao}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="material-fator"
                        className="ob-label"
                      >
                        Fator de Conversão *
                      </label>
                      <input
                        id="material-fator"
                        type="number"
                        step="any"
                        min="0.0001"
                        required={temConversao}
                        value={formFatorConversao}
                        onChange={(e) => setFormFatorConversao(e.target.value)}
                        className="ob-input w-full font-mono tabular-nums"
                      />
                    </div>

                    {unCompraObj && unConsumoObj && (
                      <div className="sm:col-span-2 text-sm text-accent-text dark:text-primary italic">
                        Exemplo: Cada 1 {unCompraObj.sigla} comprado gerará {formFatorConversao || 1} {unConsumoObj.sigla} no saldo de estoque.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Indicadores adicionais */}
              <div className="flex flex-wrap gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={formExigeTeste}
                    onChange={(e) => setFormExigeTeste(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span>Exige Teste de Qualidade no Recebimento</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={formEhKit}
                    onChange={(e) => setFormEhKit(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span>Composição em Kit de Materiais</span>
                </label>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={fecharModalMaterial}
                  className="ob-btn ob-btn--outline text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarMaterialMutation.isPending || atualizarMaterialMutation.isPending}
                  className="ob-btn ob-btn--primary text-sm font-semibold"
                >
                  {criarMaterialMutation.isPending || atualizarMaterialMutation.isPending
                    ? 'Salvando...'
                    : materialEmEdicao
                    ? 'Salvar Alterações'
                    : 'Cadastrar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Categorias */}
      {modalGerenciarCategorias && (
        <div className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest text-on-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-outline-variant">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-on-surface">
                Gerenciar Categorias de Materiais
              </h2>
              <button
                type="button"
                onClick={() => setModalGerenciarCategorias(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                X
              </button>
            </div>

            {mensagemSucesso && (
              <div className="p-3 mb-4 rounded-xl bg-secondary-container text-on-secondary-container border border-secondary text-xs font-medium">
                {mensagemSucesso}
              </div>
            )}

            {mensagemErro && (
              <div className="p-3 mb-4 rounded-xl bg-error-container text-on-error-container border border-error text-xs font-medium">
                {mensagemErro}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (nomeCategoriaInput.trim()) {
                  salvarCategoriaMutation.mutate()
                }
              }}
              className="flex gap-2 mb-6 p-4 rounded-xl bg-surface-container-low border border-outline-variant"
            >
              <input
                type="text"
                required
                value={nomeCategoriaInput}
                onChange={(e) => setNomeCategoriaInput(e.target.value)}
                placeholder={categoriaEmEdicao ? 'Alterar nome da categoria...' : 'Nome da nova categoria...'}
                className="ob-input flex-1 text-sm"
              />
              <button
                type="submit"
                disabled={salvarCategoriaMutation.isPending}
                className="ob-btn ob-btn--primary text-sm font-semibold whitespace-nowrap"
              >
                {categoriaEmEdicao ? 'Salvar' : 'Adicionar'}
              </button>
              {categoriaEmEdicao && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoriaEmEdicao(null)
                    setNomeCategoriaInput('')
                  }}
                  className="ob-btn ob-btn--outline text-sm"
                >
                  Cancelar
                </button>
              )}
            </form>

            <div className="border border-outline-variant rounded-xl overflow-hidden">
              <table className="ob-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="font-semibold text-xs uppercase tracking-wider">Nome da Categoria</th>
                    <th className="font-semibold text-xs uppercase tracking-wider text-center">Materiais</th>
                    <th className="font-semibold text-xs uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((cat) => {
                    const totalVinculados = cat._count?.materiais || 0
                    return (
                      <tr key={cat.id}>
                        <td className="text-on-surface">
                          {cat.nome}
                        </td>
                        <td className="text-center">
                          <span
                            className={`ob-badge text-xs ${
                              totalVinculados > 0 ? 'ob-badge--info' : ''
                            }`}
                          >
                            {totalVinculados} vinculado(s)
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCategoriaEmEdicao(cat)
                                setNomeCategoriaInput(cat.nome)
                              }}
                              className="ob-btn ob-btn--outline text-xs py-1 px-2.5"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={totalVinculados > 0}
                              title={
                                totalVinculados > 0
                                  ? 'Não é possível excluir pois há materiais vinculados'
                                  : 'Excluir categoria'
                              }
                              onClick={() => {
                                if (confirm(`Deseja realmente excluir a categoria "${cat.nome}"?`)) {
                                  excluirCategoriaMutation.mutate(cat.id)
                                }
                              }}
                              className={`ob-btn text-xs py-1 px-2.5 border ${
                                totalVinculados > 0
                                  ? 'border-outline text-on-surface-variant opacity-40 cursor-not-allowed'
                                  : 'border-error text-error hover:bg-error-container'
                              }`}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Unidades */}
      {modalGerenciarUnidades && (
        <div className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest text-on-surface rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-outline-variant">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-on-surface">
                Gerenciar Unidades de Medida
              </h2>
              <button
                type="button"
                onClick={() => setModalGerenciarUnidades(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                X
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (descricaoUnidadeInput.trim() && (unidadeEmEdicao || siglaUnidadeInput.trim())) {
                  salvarUnidadeMutation.mutate()
                }
              }}
              className={`grid ${
                unidadeEmEdicao ? 'grid-cols-1 sm:grid-cols-[1fr_auto_auto]' : 'grid-cols-1 sm:grid-cols-[1fr_2fr_auto]'
              } gap-2 mb-6 p-4 rounded-xl bg-surface-container-low border border-outline-variant items-center`}
            >
              {!unidadeEmEdicao && (
                <input
                  type="text"
                  required
                  value={siglaUnidadeInput}
                  onChange={(e) => setSiglaUnidadeInput(e.target.value.toUpperCase())}
                  placeholder="Sigla (ex: M3)"
                  className="ob-input font-mono text-sm uppercase"
                />
              )}
              <input
                type="text"
                required
                value={descricaoUnidadeInput}
                onChange={(e) => setDescricaoUnidadeInput(e.target.value)}
                placeholder="Descrição da unidade..."
                className="ob-input text-sm"
              />
              <button
                type="submit"
                disabled={salvarUnidadeMutation.isPending}
                className="ob-btn ob-btn--primary text-sm font-semibold whitespace-nowrap"
              >
                {unidadeEmEdicao ? 'Salvar' : 'Adicionar'}
              </button>
              {unidadeEmEdicao && (
                <button
                  type="button"
                  onClick={() => {
                    setUnidadeEmEdicao(null)
                    setSiglaUnidadeInput('')
                    setDescricaoUnidadeInput('')
                  }}
                  className="ob-btn ob-btn--outline text-sm"
                >
                  Cancelar
                </button>
              )}
            </form>

            <div className="border border-outline-variant rounded-xl overflow-hidden">
              <table className="ob-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="font-semibold text-xs uppercase tracking-wider">Sigla</th>
                    <th className="font-semibold text-xs uppercase tracking-wider">Descrição</th>
                    <th className="font-semibold text-xs uppercase tracking-wider text-center">Materiais</th>
                    <th className="font-semibold text-xs uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {unidades.map((u) => {
                    const totalVinculados =
                      (u._count?.materiaisCompra || 0) + (u._count?.materiaisConsumo || 0)

                    return (
                      <tr key={u.id}>
                        <td className="font-mono font-bold text-on-surface">
                          {u.sigla}
                        </td>
                        <td className="text-on-surface">
                          {u.descricao}
                        </td>
                        <td className="text-center">
                          <span
                            className={`ob-badge text-xs ${
                              totalVinculados > 0 ? 'ob-badge--info' : ''
                            }`}
                          >
                            {totalVinculados} vinculado(s)
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setUnidadeEmEdicao(u)
                                setDescricaoUnidadeInput(u.descricao)
                              }}
                              className="ob-btn ob-btn--outline text-xs py-1 px-2.5"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={totalVinculados > 0}
                              title={
                                totalVinculados > 0
                                  ? 'Não é possível excluir pois há materiais vinculados'
                                  : 'Excluir unidade'
                              }
                              onClick={() => {
                                if (confirm(`Deseja realmente excluir a unidade "${u.sigla}"?`)) {
                                  excluirUnidadeMutation.mutate(u.id)
                                }
                              }}
                              className={`ob-btn text-xs py-1 px-2.5 border ${
                                totalVinculados > 0
                                  ? 'border-outline text-on-surface-variant opacity-40 cursor-not-allowed'
                                  : 'border-error text-error hover:bg-error-container'
                              }`}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
export default MateriaisPage
