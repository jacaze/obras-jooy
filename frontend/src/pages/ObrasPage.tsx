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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Cabecalho da Pagina */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 0.25rem', fontSize: '1.75rem' }}>
            Obras e Pavimentos
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            Estrutura da obra e organizacao por setores/pavimentos para controle de materiais
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {podeGerenciarObras && (
            <button
              onClick={() => {
                setNovoCodigoObra('')
                setNovoNomeObra('')
                setNovaCidadeObra('')
                setErroObra(null)
                setModalNovaObraAberto(true)
              }}
              style={{
                backgroundColor: '#ffffff',
                color: '#0284c7',
                border: '1px solid #0284c7',
                padding: '0.6rem 1.1rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Nova Obra
            </button>
          )}

          {podeGerenciarAreas && obraAtual && (
            <button
              onClick={() => {
                setNovoNomeArea('')
                setNovaOrdemArea(areas.length > 0 ? Math.max(...areas.map((a) => a.ordem)) + 1 : 0)
                setErroArea(null)
                setModalNovaAreaAberto(true)
              }}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Nova Area
            </button>
          )}
        </div>
      </div>

      {erroExclusaoArea && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            border: '1px solid #fecaca',
            fontSize: '0.9rem',
          }}
        >
          {erroExclusaoArea}
        </div>
      )}

      {carregandoObras ? (
        <p style={{ color: '#64748b' }}>Carregando dados das obras...</p>
      ) : obras.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '3rem',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            color: '#64748b',
          }}
        >
          Nenhuma obra cadastrada no sistema.
        </div>
      ) : (
        <>
          {/* Cartao Informativo da Obra Ativa */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {obraAtual.codigo}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>
                    {obraAtual.nome}
                  </h2>
                  <span
                    style={{
                      backgroundColor: obraAtual.ativa ? '#dcfce7' : '#fee2e2',
                      color: obraAtual.ativa ? '#166534' : '#991b1b',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {obraAtual.ativa ? 'Obra Ativa' : 'Obra Inativa'}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  Cidade: <strong>{obraAtual.cidade}</strong> | Total de Áreas/Pavimentos: <strong>{areas.length}</strong>
                </p>
              </div>

              {/* Seletor caso haja mais de uma obra */}
              {obras.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                    Alternar Empreendimento:
                  </label>
                  <select
                    value={obraAtual.id}
                    onChange={(e) => setObraSelecionadaId(e.target.value)}
                    style={{
                      padding: '0.45rem 0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                    }}
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
                  disabled={toggleObraMutation.isPending}
                  onClick={() => toggleObraMutation.mutate({ id: obraAtual.id, ativa: !obraAtual.ativa })}
                  style={{
                    backgroundColor: obraAtual.ativa ? '#fef2f2' : '#f0fdf4',
                    color: obraAtual.ativa ? '#b91c1c' : '#15803d',
                    border: `1px solid ${obraAtual.ativa ? '#fecaca' : '#bbf7d0'}`,
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {obraAtual.ativa ? 'Desativar Obra' : 'Reativar Obra'}
                </button>
              )}
            </div>
          </div>

          {/* Secao de Gestao de Areas */}
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem', color: '#0f172a', fontSize: '1.15rem' }}>
                Pavimentos e Setores da Obra
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                {podeGerenciarAreas
                  ? 'Engenharia e Administracao possuem permissao para cadastrar, editar e gerenciar areas'
                  : 'Visualizacao restrita aos dados cadastrados'}
              </p>
            </div>

            <input
              type="text"
              placeholder="Buscar por nome da area ou pavimento..."
              value={buscaArea}
              onChange={(e) => setBuscaArea(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '380px',
                padding: '0.55rem 0.9rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {carregandoAreas ? (
            <p style={{ color: '#64748b' }}>Carregando areas da obra...</p>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '100px' }}>Ordem</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Nome da Area / Pavimento</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Situacao</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Cadastrada Em</th>
                    {podeGerenciarAreas && <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acoes</th>}
                  </tr>
                </thead>
                <tbody>
                  {areasFiltradas.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            display: 'inline-block',
                            minWidth: '24px',
                            textAlign: 'center',
                          }}
                        >
                          {a.ordem}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                        {a.nome}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            backgroundColor: a.ativa ? '#dcfce7' : '#fee2e2',
                            color: a.ativa ? '#166534' : '#991b1b',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {a.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {new Date(a.criadaEm).toLocaleDateString('pt-BR')}
                      </td>
                      {podeGerenciarAreas && (
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => abrirModalEditar(a)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                              }}
                            >
                              Editar
                            </button>

                            <button
                              disabled={toggleAreaMutation.isPending}
                              onClick={() => toggleAreaMutation.mutate({ id: a.id, ativa: !a.ativa })}
                              style={{
                                backgroundColor: a.ativa ? '#fff7ed' : '#f0fdf4',
                                color: a.ativa ? '#c2410c' : '#15803d',
                                border: `1px solid ${a.ativa ? '#ffedd5' : '#bbf7d0'}`,
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                            >
                              {a.ativa ? 'Desativar' : 'Ativar'}
                            </button>

                            <button
                              disabled={excluirAreaMutation.isPending}
                              onClick={() => handleConfirmarExclusao(a)}
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
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
                      <td colSpan={podeGerenciarAreas ? 5 : 4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        Nenhuma area cadastrada ou encontrada para esta obra.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal: Nova Obra */}
      {modalNovaObraAberto && (
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
              padding: '2rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#0f172a' }}>
              Cadastrar Nova Obra
            </h2>

            {erroObra && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroObra}
              </div>
            )}

            <form onSubmit={handleCriarObra} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Codigo Interno (imutavel)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: JOOY-02"
                  value={novoCodigoObra}
                  onChange={(e) => setNovoCodigoObra(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Nome do Empreendimento / Condominio
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Residencial Jooy Horizonte"
                  value={novoNomeObra}
                  onChange={(e) => setNovoNomeObra(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Cidade
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Campo Grande"
                  value={novaCidadeObra}
                  onChange={(e) => setNovaCidadeObra(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNovaObraAberto(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarObraMutation.isPending}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
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
              padding: '2rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0f172a' }}>
              Cadastrar Nova Area
            </h2>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.85rem' }}>
              Obra: <strong>{obraAtual?.nome}</strong>
            </p>

            {erroArea && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroArea}
              </div>
            )}

            <form onSubmit={handleCriarArea} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Nome da Area / Pavimento
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 4o Pavimento ou Garagem"
                  value={novoNomeArea}
                  onChange={(e) => setNovoNomeArea(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Ordem de Exibicao (Negativo = Subsolo, 0 = Terreo)
                </label>
                <input
                  type="number"
                  required
                  value={novaOrdemArea}
                  onChange={(e) => setNovaOrdemArea(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNovaAreaAberto(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarAreaMutation.isPending}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
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
              padding: '2rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0f172a' }}>
              Editar Area / Pavimento
            </h2>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.85rem' }}>
              Obra: <strong>{obraAtual?.nome}</strong>
            </p>

            {erroEdicaoArea && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroEdicaoArea}
              </div>
            )}

            <form onSubmit={handleEditarArea} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Nome da Area / Pavimento
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 1o Pavimento Torre A"
                  value={editarNomeArea}
                  onChange={(e) => setEditarNomeArea(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Ordem de Exibicao
                </label>
                <input
                  type="number"
                  required
                  value={editarOrdemArea}
                  onChange={(e) => setEditarOrdemArea(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarAreaAberto(false)
                    setAreaParaEditar(null)
                  }}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editarAreaMutation.isPending}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {editarAreaMutation.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
