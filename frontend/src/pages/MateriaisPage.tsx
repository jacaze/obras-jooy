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
  createUnidadeMedida,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Material, TipoControleMaterial } from '../types/material'

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
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [somenteAtivos, setSomenteAtivos] = useState(true)

  // Estados dos Modais
  const [modalMaterialAberto, setModalMaterialAberto] = useState(false)
  const [materialEmEdicao, setMaterialEmEdicao] = useState<Material | null>(null)

  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')

  const [modalUnidadeAberto, setModalUnidadeAberto] = useState(false)
  const [novaUnidadeSigla, setNovaUnidadeSigla] = useState('')
  const [novaUnidadeDescricao, setNovaUnidadeDescricao] = useState('')

  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  // Form de Material
  const [formCodigo, setFormCodigo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formCategoriaId, setFormCategoriaId] = useState('')
  const [formTipoControle, setFormTipoControle] = useState<TipoControleMaterial>('CONSUMO')
  const [formUnCompraId, setFormUnCompraId] = useState('')
  const [formUnConsumoId, setFormUnConsumoId] = useState('')
  const [formFatorConversao, setFormFatorConversao] = useState('1')
  const [formEhKit, setFormEhKit] = useState(false)
  const [formExigeTeste, setFormExigeTeste] = useState(false)

  // Queries
  const { data: materiais = [], isLoading: carregandoMateriais } = useQuery({
    queryKey: ['materiais', busca, categoriaFiltro, tipoFiltro, somenteAtivos],
    queryFn: () =>
      getMateriais({
        busca: busca.trim() || undefined,
        categoriaId: categoriaFiltro || undefined,
        tipoControle: (tipoFiltro as TipoControleMaterial) || undefined,
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

  // Mutations
  const criarMaterialMutation = useMutation({
    mutationFn: createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
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

  const criarCategoriaMutation = useMutation({
    mutationFn: createCategoriaMaterial,
    onSuccess: (nova) => {
      queryClient.invalidateQueries({ queryKey: ['categorias-material'] })
      setNovaCategoriaNome('')
      setModalCategoriaAberto(false)
      setFormCategoriaId(nova.id)
      setMensagemSucesso(`Categoria "${nova.nome}" criada com sucesso.`)
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.message || 'Erro ao criar categoria.')
    },
  })

  const criarUnidadeMutation = useMutation({
    mutationFn: createUnidadeMedida,
    onSuccess: (nova) => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] })
      setNovaUnidadeSigla('')
      setNovaUnidadeDescricao('')
      setModalUnidadeAberto(false)
      setMensagemSucesso(`Unidade "${nova.sigla}" criada com sucesso.`)
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.message || 'Erro ao criar unidade de medida.')
    },
  })

  function abrirModalCriacao() {
    setMaterialEmEdicao(null)
    setFormCodigo('')
    setFormDescricao('')
    setFormCategoriaId(categorias[0]?.id || '')
    setFormTipoControle('CONSUMO')
    setFormUnCompraId(unidades[0]?.id || '')
    setFormUnConsumoId(unidades[0]?.id || '')
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
    setFormTipoControle(mat.tipoControle)
    setFormUnCompraId(mat.unidadeCompraId)
    setFormUnConsumoId(mat.unidadeConsumoId)
    setFormFatorConversao(String(mat.fatorConversao))
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

    const fatorNum = Number(formFatorConversao)
    if (isNaN(fatorNum) || fatorNum <= 0) {
      setMensagemErro('O fator de conversao deve ser um numero positivo maior que zero.')
      return
    }

    if (materialEmEdicao) {
      atualizarMaterialMutation.mutate({
        id: materialEmEdicao.id,
        dados: {
          descricao: formDescricao,
          categoriaId: formCategoriaId,
          tipoControle: formTipoControle,
          unidadeCompraId: formUnCompraId,
          unidadeConsumoId: formUnConsumoId,
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
        tipoControle: formTipoControle,
        unidadeCompraId: formUnCompraId,
        unidadeConsumoId: formUnConsumoId,
        fatorConversao: fatorNum,
        ehKit: formEhKit,
        exigeTesteQualidade: formExigeTeste,
      })
    }
  }

  // Calculo de descricao dinamica de conversao
  const unCompraObj = unidades.find((u) => u.id === formUnCompraId)
  const unConsumoObj = unidades.find((u) => u.id === formUnConsumoId)
  const mesmasUnidades = Boolean(formUnCompraId && formUnConsumoId && formUnCompraId === formUnConsumoId)

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Cabecalho da Pagina */}
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
            Catalogo de Materiais
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Controle de insumos, ferramentas patrimoniais, unidades de medida e taxas de conversao.
          </p>
        </div>

        {podeGerenciar && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setModalCategoriaAberto(true)}
              style={{
                padding: '0.6rem 1rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Nova Categoria
            </button>
            <button
              type="button"
              onClick={() => setModalUnidadeAberto(true)}
              style={{
                padding: '0.6rem 1rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Nova Unidade
            </button>
            <button
              type="button"
              onClick={abrirModalCriacao}
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
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#166534',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {mensagemSucesso}
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
          }}
        >
          {mensagemErro}
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            htmlFor="filtro-busca"
            style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
          >
            Buscar Material
          </label>
          <input
            id="filtro-busca"
            type="text"
            placeholder="Nome ou codigo..."
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
            htmlFor="filtro-categoria"
            style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
          >
            Categoria
          </label>
          <select
            id="filtro-categoria"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
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
            <option value="">Todas as categorias</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filtro-tipo"
            style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
          >
            Tipo de Controle
          </label>
          <select
            id="filtro-tipo"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
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
            <option value="">Todos os tipos</option>
            <option value="CONSUMO">Consumo / Estoque Quantitativo</option>
            <option value="FERRAMENTA_PATRIMONIO">Ferramenta Patrimonial</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem' }}>
          <input
            id="filtro-somente-ativos"
            type="checkbox"
            checked={somenteAtivos}
            onChange={(e) => setSomenteAtivos(e.target.checked)}
            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
          />
          <label
            htmlFor="filtro-somente-ativos"
            style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500, cursor: 'pointer' }}
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
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Codigo
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Descricao / Material
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Categoria
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Tipo
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Conversao de Unidades
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Situacao
                </th>
                {podeGerenciar && (
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                    Acoes
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {carregandoMateriais ? (
                <tr>
                  <td colSpan={podeGerenciar ? 7 : 6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Carregando catalogo de materiais...
                  </td>
                </tr>
              ) : materiais.length === 0 ? (
                <tr>
                  <td colSpan={podeGerenciar ? 7 : 6} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    Nenhum material encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                materiais.map((mat) => {
                  const fatorNum = Number(mat.fatorConversao)
                  const ehMesmaUnidade = mat.unidadeCompraId === mat.unidadeConsumoId

                  return (
                    <tr
                      key={mat.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        opacity: mat.ativo ? 1 : 0.6,
                      }}
                    >
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                        {mat.codigo}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                          {mat.descricao}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          {mat.exigeTesteQualidade && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.4rem',
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
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.4rem',
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
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#334155' }}>
                        {mat.categoria?.nome || '-'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem' }}>
                        {mat.tipoControle === 'FERRAMENTA_PATRIMONIO' ? (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              borderRadius: '4px',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          >
                            Ferramenta Patrimonial
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              borderRadius: '4px',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          >
                            Consumo / Estoque
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#334155' }}>
                        {ehMesmaUnidade ? (
                          <span>1 {mat.unidadeCompra?.sigla} = 1 {mat.unidadeConsumo?.sigla}</span>
                        ) : (
                          <span style={{ fontWeight: 600, color: '#0369a1' }}>
                            1 {mat.unidadeCompra?.sigla} = {fatorNum} {mat.unidadeConsumo?.sigla}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {mat.ativo ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Ativo
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Inativo
                          </span>
                        )}
                      </td>
                      {podeGerenciar && (
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => abrirModalEdicao(mat)}
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
                            <button
                              type="button"
                              onClick={() =>
                                toggleSituacaoMutation.mutate({ id: mat.id, ativo: !mat.ativo })
                              }
                              style={{
                                padding: '0.35rem 0.7rem',
                                backgroundColor: '#ffffff',
                                border: mat.ativo ? '1px solid #fca5a5' : '1px solid #86efac',
                                borderRadius: '4px',
                                color: mat.ativo ? '#b91c1c' : '#15803d',
                                fontSize: '0.75rem',
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

      {/* Modal de Cadastro / Edicao de Material */}
      {modalMaterialAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
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
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {materialEmEdicao ? `Editar Material (${materialEmEdicao.codigo})` : 'Novo Material'}
              </h2>
              <button
                type="button"
                onClick={fecharModalMaterial}
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

            <form onSubmit={handleSalvarMaterial} style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor="material-codigo"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
                  >
                    Codigo (Sienge/ERP) *
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
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      backgroundColor: materialEmEdicao ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="material-descricao"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
                  >
                    Descricao Completa *
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
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor="material-categoria"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
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
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
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
                    htmlFor="material-tipo-controle"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
                  >
                    Tipo de Controle *
                  </label>
                  <select
                    id="material-tipo-controle"
                    value={formTipoControle}
                    onChange={(e) => setFormTipoControle(e.target.value as TipoControleMaterial)}
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
                    <option value="CONSUMO">Consumo / Estoque Quantitativo</option>
                    <option value="FERRAMENTA_PATRIMONIO">Ferramenta Patrimonial</option>
                  </select>
                </div>
              </div>

              {/* Bloco de Conversao de Unidades */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '1rem',
                  display: 'grid',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                  Unidades e Fator de Conversao
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label
                      htmlFor="material-un-compra"
                      style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
                    >
                      Unidade de Compra *
                    </label>
                    <select
                      id="material-un-compra"
                      required
                      value={formUnCompraId}
                      onChange={(e) => setFormUnCompraId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="">Selecione...</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.sigla} - {u.descricao}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="material-un-consumo"
                      style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
                    >
                      Unidade de Estoque/Uso *
                    </label>
                    <select
                      id="material-un-consumo"
                      required
                      value={formUnConsumoId}
                      onChange={(e) => setFormUnConsumoId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="">Selecione...</option>
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
                      style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
                    >
                      Fator de Conversao *
                    </label>
                    <input
                      id="material-fator"
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      disabled={mesmasUnidades}
                      value={mesmasUnidades ? '1' : formFatorConversao}
                      onChange={(e) => setFormFatorConversao(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        backgroundColor: mesmasUnidades ? '#e2e8f0' : '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Mensagem explicativa da conversao */}
                <div style={{ fontSize: '0.8rem', color: '#0369a1', fontStyle: 'italic' }}>
                  {mesmasUnidades ? (
                    'Unidades identicas: 1 compra equivale a 1 no estoque (fator fixo em 1).'
                  ) : unCompraObj && unConsumoObj ? (
                    `Explicacao: Cada 1 ${unCompraObj.sigla} comprado gerara ${formFatorConversao || 1} ${unConsumoObj.sigla} no saldo de estoque da obra.`
                  ) : (
                    'Selecione as unidades de compra e consumo para configurar o fator.'
                  )}
                </div>
              </div>

              {/* Indicadores adicionais */}
              <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={formExigeTeste}
                    onChange={(e) => setFormExigeTeste(e.target.checked)}
                  />
                  <span>Exige Teste de Qualidade no Recebimento</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={formEhKit}
                    onChange={(e) => setFormEhKit(e.target.checked)}
                  />
                  <span>Composicao em Kit de Materiais</span>
                </label>
              </div>

              {/* Botoes de Acao */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={fecharModalMaterial}
                  style={{
                    padding: '0.6rem 1.25rem',
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
                    padding: '0.6rem 1.5rem',
                    backgroundColor: '#0284c7',
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
                    ? 'Salvar Alteracoes'
                    : 'Cadastrar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Categoria */}
      {modalCategoriaAberto && (
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
              maxWidth: '450px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
              Nova Categoria de Material
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (novaCategoriaNome.trim()) {
                  criarCategoriaMutation.mutate({ nome: novaCategoriaNome.trim() })
                }
              }}
            >
              <label
                htmlFor="nova-categoria-nome"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
              >
                Nome da Categoria *
              </label>
              <input
                id="nova-categoria-nome"
                type="text"
                required
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
                placeholder="Ex: Alvenaria e Cimento"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  marginBottom: '1.25rem',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setModalCategoriaAberto(false)}
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
                  disabled={criarCategoriaMutation.isPending}
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
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Unidade de Medida */}
      {modalUnidadeAberto && (
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
              maxWidth: '450px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
              Nova Unidade de Medida
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (novaUnidadeSigla.trim() && novaUnidadeDescricao.trim()) {
                  criarUnidadeMutation.mutate({
                    sigla: novaUnidadeSigla.trim(),
                    descricao: novaUnidadeDescricao.trim(),
                  })
                }
              }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <div>
                <label
                  htmlFor="nova-unidade-sigla"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
                >
                  Sigla (abreviacao) *
                </label>
                <input
                  id="nova-unidade-sigla"
                  type="text"
                  required
                  value={novaUnidadeSigla}
                  onChange={(e) => setNovaUnidadeSigla(e.target.value.toUpperCase())}
                  placeholder="Ex: M3"
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
                  htmlFor="nova-unidade-descricao"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
                >
                  Descricao da Unidade *
                </label>
                <input
                  id="nova-unidade-descricao"
                  type="text"
                  required
                  value={novaUnidadeDescricao}
                  onChange={(e) => setNovaUnidadeDescricao(e.target.value)}
                  placeholder="Ex: Metro Cubico"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalUnidadeAberto(false)}
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
                  disabled={criarUnidadeMutation.isPending}
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
                  Salvar Unidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default MateriaisPage
