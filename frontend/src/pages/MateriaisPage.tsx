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
      setMensagemErro(err.response?.data?.message || 'Erro ao cadastrar material.')
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
      setMensagemErro(err.response?.data?.message || 'Erro ao atualizar material.')
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
      setMensagemErro(err.response?.data?.message || 'Erro ao alterar situacao do material.')
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-material'] })
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
      setCategoriaEmEdicao(null)
      setNomeCategoriaInput('')
      setMensagemSucesso('Categoria salva com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.message || 'Erro ao salvar categoria.')
    },
  })

  const excluirCategoriaMutation = useMutation({
    mutationFn: deleteCategoriaMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-material'] })
      setMensagemSucesso('Categoria excluida com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.message || 'Erro ao excluir categoria.')
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
      setMensagemSucesso('Unidade de medida salva com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.message || 'Erro ao salvar unidade.')
    },
  })

  const excluirUnidadeMutation = useMutation({
    mutationFn: deleteUnidadeMedida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] })
      setMensagemSucesso('Unidade de medida excluida com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.message || 'Erro ao excluir unidade.')
    },
  })

  function abrirModalCriacao() {
    setMaterialEmEdicao(null)
    setFormCodigo('')
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

    if (materialEmEdicao) {
      atualizarMaterialMutation.mutate({
        id: materialEmEdicao.id,
        dados: {
          descricao: formDescricao,
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
        codigo: formCodigo,
        descricao: formDescricao,
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
    <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
      {/* Cabecalho da Pagina */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Catálogo de Materiais
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '1rem' }}>
            Controle de insumos, unidades de medida e taxas opcionais de conversão de compra.
          </p>
        </div>

        {podeGerenciar && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setCategoriaEmEdicao(null)
                setNomeCategoriaInput('')
                setMensagemErro(null)
                setModalGerenciarCategorias(true)
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
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
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Gerenciar Unidades
            </button>
            <button
              type="button"
              onClick={abrirModalCriacao}
              style={{
                padding: '8px 24px',
                backgroundColor: '#0369a1',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
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
          style={{
            padding: '16px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#166534',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}
        >
          {mensagemSucesso}
        </div>
      )}

      {mensagemErro && (
        <div
          role="alert"
          style={{
            padding: '16px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}
        >
          {mensagemErro}
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          alignItems: 'end',
        }}
      >
        <div>
          <label
            htmlFor="filtro-busca"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}
          >
            Buscar Insumo
          </label>
          <input
            id="filtro-busca"
            type="text"
            placeholder="Nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="filtro-categoria"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}
          >
            Categoria
          </label>
          <select
            id="filtro-categoria"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
          <input
            id="filtro-somente-ativos"
            type="checkbox"
            checked={somenteAtivos}
            onChange={(e) => setSomenteAtivos(e.target.checked)}
            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
          />
          <label
            htmlFor="filtro-somente-ativos"
            style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 400, cursor: 'pointer' }}
          >
            Exibir somente materiais ativos
          </label>
        </div>
      </div>

      {/* Tabela de Materiais */}
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
                <th style={{ padding: '16px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Código
                </th>
                <th style={{ padding: '16px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Descrição / Insumo
                </th>
                <th style={{ padding: '16px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Categoria
                </th>
                <th style={{ padding: '16px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Unidade Padrão
                </th>
                <th style={{ padding: '16px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Conversão de Compra
                </th>
                <th style={{ padding: '16px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Situação
                </th>
                {podeGerenciar && (
                  <th style={{ padding: '16px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {carregandoMateriais ? (
                <tr>
                  <td colSpan={podeGerenciar ? 7 : 6} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>
                    Carregando catálogo de materiais...
                  </td>
                </tr>
              ) : materiais.length === 0 ? (
                <tr>
                  <td colSpan={podeGerenciar ? 7 : 6} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>
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
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        opacity: mat.ativo ? 1 : 0.6,
                      }}
                    >
                      <td style={{ padding: '16px 16px', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                        {mat.codigo}
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                          {mat.descricao}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          {mat.exigeTesteQualidade && (
                            <span
                              style={{
                                fontSize: '0.875rem',
                                padding: '8px 8px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              Exige Teste de Qualidade
                            </span>
                          )}
                          {mat.ehKit && (
                            <span
                              style={{
                                fontSize: '0.875rem',
                                padding: '8px 8px',
                                backgroundColor: '#f3e8ff',
                                color: '#6b21a8',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              Kit de Materiais
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 16px', fontSize: '0.875rem', color: '#334155' }}>
                        {mat.categoria?.nome || '-'}
                      </td>
                      <td style={{ padding: '16px 16px', fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                        {mat.unidadeConsumo?.sigla} ({mat.unidadeConsumo?.descricao})
                      </td>
                      <td style={{ padding: '16px 16px', fontSize: '0.875rem' }}>
                        {possuiConversaoAtiva ? (
                          <span style={{ fontWeight: 600, color: '#0369a1' }}>
                            1 {mat.unidadeCompra?.sigla} = {fatorNum} {mat.unidadeConsumo?.sigla}
                          </span>
                        ) : (
                          <span style={{ color: '#475569' }}>Direta (1:1)</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        {mat.ativo ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '8px 8px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            Ativo
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '8px 8px',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            Inativo
                          </span>
                        )}
                      </td>
                      {podeGerenciar && (
                        <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => abrirModalEdicao(mat)}
                              style={{
                                padding: '8px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                color: '#1e293b',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleSituacaoMutation.mutate({ id: mat.id, ativo: !mat.ativo })
                              }
                              style={{
                                padding: '8px 8px',
                                backgroundColor: '#ffffff',
                                border: mat.ativo ? '1px solid #fca5a5' : '1px solid #86efac',
                                borderRadius: '4px',
                                color: mat.ativo ? '#b91c1c' : '#15803d',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                {materialEmEdicao ? `Editar Insumo (${materialEmEdicao.codigo})` : 'Novo Insumo'}
              </h2>
              <button
                type="button"
                onClick={fecharModalMaterial}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

            <form onSubmit={handleSalvarMaterial} style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div>
                  <label
                    htmlFor="material-codigo"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}
                  >
                    Código (Sienge/ERP) *
                  </label>
                  <input
                    id="material-codigo"
                    type="text"
                    required
                    disabled={!!materialEmEdicao}
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                    placeholder="Ex: CIM-01"
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      backgroundColor: materialEmEdicao ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="material-descricao"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}
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
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label
                    htmlFor="material-categoria"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}
                  >
                    Categoria *
                  </label>
                  <select
                    id="material-categoria"
                    required
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                    }}
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
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}
                  >
                    Unidade Padrão de Estoque/Uso *
                  </label>
                  <select
                    id="material-un-consumo"
                    required
                    value={formUnConsumoId}
                    onChange={(e) => setFormUnConsumoId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                    }}
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
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '16px',
                  display: 'grid',
                  gap: '16px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                    Material possui unidade de compra diferente (com taxa de conversão)?
                  </span>
                </label>

                {temConversao && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                    <div>
                      <label
                        htmlFor="material-un-compra"
                        style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}
                      >
                        Unidade de Compra *
                      </label>
                      <select
                        id="material-un-compra"
                        required={temConversao}
                        value={formUnCompraId}
                        onChange={(e) => setFormUnCompraId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.875rem',
                          backgroundColor: '#ffffff',
                        }}
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
                        style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}
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
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.875rem',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {unCompraObj && unConsumoObj && (
                      <div style={{ gridColumn: 'span 2', fontSize: '0.875rem', color: '#0369a1', fontStyle: 'italic' }}>
                        Exemplo: Cada 1 {unCompraObj.sigla} comprado gerará {formFatorConversao || 1} {unConsumoObj.sigla} no saldo de estoque.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Indicadores adicionais */}
              <div style={{ display: 'flex', gap: '32px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={formExigeTeste}
                    onChange={(e) => setFormExigeTeste(e.target.checked)}
                  />
                  <span>Exige Teste de Qualidade no Recebimento</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={formEhKit}
                    onChange={(e) => setFormEhKit(e.target.checked)}
                  />
                  <span>Composição em Kit de Materiais</span>
                </label>
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={fecharModalMaterial}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarMaterialMutation.isPending || atualizarMaterialMutation.isPending}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: '#0369a1',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                Gerenciar Categorias de Materiais
              </h2>
              <button
                type="button"
                onClick={() => setModalGerenciarCategorias(false)}
                style={{ background: 'none', border: 'none', fontSize: '1rem', color: '#475569', cursor: 'pointer' }}
              >
                X
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (nomeCategoriaInput.trim()) {
                  salvarCategoriaMutation.mutate()
                }
              }}
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <input
                type="text"
                required
                value={nomeCategoriaInput}
                onChange={(e) => setNomeCategoriaInput(e.target.value)}
                placeholder={categoriaEmEdicao ? 'Alterar nome da categoria...' : 'Nome da nova categoria...'}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                }}
              />
              <button
                type="submit"
                disabled={salvarCategoriaMutation.isPending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0369a1',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
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
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#475569',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              )}
            </form>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 16px', fontWeight: 600, color: '#475569' }}>Nome da Categoria</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Materiais</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((cat) => {
                    const totalVinculados = cat._count?.materiais || 0
                    return (
                      <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 16px', fontWeight: 400, color: '#1e293b' }}>
                          {cat.nome}
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'center', color: '#475569' }}>
                          <span
                            style={{
                              padding: '8px 8px',
                              backgroundColor: totalVinculados > 0 ? '#e0f2fe' : '#f1f5f9',
                              color: totalVinculados > 0 ? '#0369a1' : '#475569',
                              borderRadius: '999px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            {totalVinculados} vinculado(s)
                          </span>
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setCategoriaEmEdicao(cat)
                                setNomeCategoriaInput(cat.nome)
                              }}
                              style={{
                                padding: '8px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                color: '#1e293b',
                                cursor: 'pointer',
                              }}
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
                              style={{
                                padding: '8px 8px',
                                backgroundColor: '#ffffff',
                                border: totalVinculados > 0 ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                color: totalVinculados > 0 ? '#475569' : '#b91c1c',
                                cursor: totalVinculados > 0 ? 'not-allowed' : 'pointer',
                              }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '650px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                Gerenciar Unidades de Medida
              </h2>
              <button
                type="button"
                onClick={() => setModalGerenciarUnidades(false)}
                style={{ background: 'none', border: 'none', fontSize: '1rem', color: '#475569', cursor: 'pointer' }}
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
              style={{
                display: 'grid',
                gridTemplateColumns: unidadeEmEdicao ? '1fr auto auto' : '1fr 2fr auto',
                gap: '8px',
                marginBottom: '24px',
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                alignItems: 'center',
              }}
            >
              {!unidadeEmEdicao && (
                <input
                  type="text"
                  required
                  value={siglaUnidadeInput}
                  onChange={(e) => setSiglaUnidadeInput(e.target.value.toUpperCase())}
                  placeholder="Sigla (ex: M3)"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                />
              )}
              <input
                type="text"
                required
                value={descricaoUnidadeInput}
                onChange={(e) => setDescricaoUnidadeInput(e.target.value)}
                placeholder="Descrição da unidade..."
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                }}
              />
              <button
                type="submit"
                disabled={salvarUnidadeMutation.isPending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0369a1',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
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
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#475569',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              )}
            </form>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 16px', fontWeight: 600, color: '#475569' }}>Sigla</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, color: '#475569' }}>Descrição</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Materiais</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {unidades.map((u) => {
                    const totalVinculados =
                      (u._count?.materiaisCompra || 0) + (u._count?.materiaisConsumo || 0)

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 16px', fontWeight: 600, color: '#0f172a' }}>
                          {u.sigla}
                        </td>
                        <td style={{ padding: '8px 16px', color: '#334155' }}>
                          {u.descricao}
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '8px 8px',
                              backgroundColor: totalVinculados > 0 ? '#e0f2fe' : '#f1f5f9',
                              color: totalVinculados > 0 ? '#0369a1' : '#475569',
                              borderRadius: '999px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            {totalVinculados} vinculado(s)
                          </span>
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setUnidadeEmEdicao(u)
                                setDescricaoUnidadeInput(u.descricao)
                              }}
                              style={{
                                padding: '8px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                color: '#1e293b',
                                cursor: 'pointer',
                              }}
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
                              style={{
                                padding: '8px 8px',
                                backgroundColor: '#ffffff',
                                border: totalVinculados > 0 ? '1px solid #e2e8f0' : '1px solid #fca5a5',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                color: totalVinculados > 0 ? '#475569' : '#b91c1c',
                                cursor: totalVinculados > 0 ? 'not-allowed' : 'pointer',
                              }}
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
    </div>
  )
}
export default MateriaisPage
