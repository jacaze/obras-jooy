import { useState, useMemo, useEffect, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  atenderRequisicao,
  cancelarRequisicao,
  createRequisicao,
  exportarAnaliticoEngenharia,
  exportarRequisicoesSienge,
  getAreasObra,
  getEtapasArea,
  getFerramentas,
  getLimitesOrcamentoObra,
  getObras,
  getRequisicoes,
  getSaldosEstoque,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { AreaObra } from '../types/obra'
import { useOfflineSync } from '../hooks/useOfflineSync'
import {
  salvarRequisicaoOffline,
  salvarCacheObras,
  obterCacheObras,
  salvarCacheEtapas,
  obterCacheEtapas,
} from '../services/offlineStorage'
import type {
  AtenderRequisicaoInput,
  CriarRequisicaoInput,
  ExportarAnaliticoEngenhariaInput,
  Requisicao,
  StatusRequisicao,
} from '../types/requisicao'
import { SeletorItemPesquisavel } from '../components/SeletorItemPesquisavel'

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

interface ItemLinhaForm {
  tipo: 'MATERIAL' | 'FERRAMENTA'
  materialId: string
  ferramentaId: string
  quantidade: number
}

function gerarChaveIdempotencia(): string {
  return 'req-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
}

function dispararDownloadCsv(conteudoCsv: string, nomeArquivo: string) {
  if (typeof window === 'undefined' || !window.URL?.createObjectURL) return
  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', nomeArquivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function RequisicoesPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  const ehEncarregado = usuario?.perfil === 'ENCARREGADO'
  const podeAtenderEExportar =
    usuario?.perfil === 'ADMIN' || usuario?.perfil === 'ALMOXARIFE'
  const podeExportarAnalitico =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ENGENHARIA' ||
    usuario?.perfil === 'ADMINISTRACAO'

  // Filtros de listagem
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS')
  const [ocultarAtendidas, setOcultarAtendidas] = useState(false)
  const [filtroSienge, setFiltroSienge] = useState<'TODAS' | 'PENDENTES' | 'EXPORTADAS'>('TODAS')
  const [mensagemFeedback, setMensagemFeedback] = useState<string | null>(null)
  const [erroFeedback, setErroFeedback] = useState<string | null>(null)

  // Modal: Nova Requisicao
  const [modalNovaRequisicaoAberto, setModalNovaRequisicaoAberto] = useState(false)
  const [obraIdSelecionada, setObraIdSelecionada] = useState('')
  const [areaIdSelecionada, setAreaIdSelecionada] = useState('')
  const [etapaIdSelecionada, setEtapaIdSelecionada] = useState('')
  const [observacao, setObservacao] = useState('')
  const [itensForm, setItensForm] = useState<ItemLinhaForm[]>([
    { tipo: 'MATERIAL', materialId: '', ferramentaId: '', quantidade: 1 },
  ])
  const [chaveIdempotencia, setChaveIdempotencia] = useState(gerarChaveIdempotencia())
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Modal: Exportacao Analitica para Engenharia (F04)
  const [modalExportacaoAnaliticaAberto, setModalExportacaoAnaliticaAberto] = useState(false)
  const [expObraId, setExpObraId] = useState('')
  const [expAreaId, setExpAreaId] = useState('')
  const [expEtapaId, setExpEtapaId] = useState('')
  const [expDataInicio, setExpDataInicio] = useState('')
  const [expDataFim, setExpDataFim] = useState('')
  const [expStatus, setExpStatus] = useState<string>('TODAS')
  const [expBusca, setExpBusca] = useState('')
  const [erroExportacaoAnalitica, setErroExportacaoAnalitica] = useState<string | null>(null)

  // Modal: Atender Requisicao (Almoxarife / Admin)
  const [requisicaoEmAtendimento, setRequisicaoEmAtendimento] = useState<Requisicao | null>(null)
  const [retiradoPor, setRetiradoPor] = useState('')
  const [qtdsEntreguesMap, setQtdsEntreguesMap] = useState<Record<string, string>>({})
  const [erroAtendimento, setErroAtendimento] = useState<string | null>(null)

  // Integracao com Modo Offline e PWA (F05)
  const { pendentes } = useOfflineSync()

  // Queries
  const { data: requisicoesServidor = [], isLoading: carregandoRequisicoes } = useQuery({
    queryKey: ['requisicoes'],
    queryFn: () => getRequisicoes(),
  })

  // Converte requisicoes offline em cards visiveis na interface
  const requisicoesOfflineParaExibicao: Requisicao[] = useMemo(() => {
    return pendentes.map((reqOff) => ({
      id: reqOff.idLocal,
      numeroSequencial: 0,
      areaId: reqOff.dados.areaId,
      etapaId: reqOff.dados.etapaId,
      status: 'PENDENTE_SINCRONIZACAO' as any,
      observacao: reqOff.dados.observacao || null,
      chaveIdempotencia: reqOff.dados.chaveIdempotencia,
      solicitadaEm: reqOff.criadaEm,
      atualizadaEm: reqOff.criadaEm,
      atendidaEm: null,
      atendidaPorId: null,
      exportadaSienge: false,
      exportadaSiengeEm: null,
      retiradoPor: null,
      requisitanteId: usuario?.id || '',
      requisitante: {
        id: usuario?.id || '',
        nome: reqOff.dadosExibicao.solicitanteNome || usuario?.nome || 'Encarregado',
        login: usuario?.login || 'encarregado',
        cargo: {
          nome: usuario?.cargo || 'Encarregado',
        },
      },
      area: {
        id: reqOff.dados.areaId,
        obraId: '',
        nome: reqOff.dadosExibicao.areaNome || 'Area',
        ordem: 1,
        ativa: true,
        criadaEm: reqOff.criadaEm,
        obra: {
          id: '',
          nome: reqOff.dadosExibicao.obraNome || 'Obra Canteiro',
          codigo: 'OFFLINE',
        },
      },
      etapa: reqOff.dados.etapaId
        ? {
            id: reqOff.dados.etapaId,
            areaId: reqOff.dados.areaId,
            nome: reqOff.dadosExibicao.etapaNome || 'Etapa',
            ordem: 1,
            status: 'EM_ANDAMENTO',
            criadaEm: reqOff.criadaEm,
          }
        : null,
      itens: reqOff.dadosExibicao.itens.map((it, idx) => ({
        id: `${reqOff.idLocal}-item-${idx}`,
        requisicaoId: reqOff.idLocal,
        tipoItem: 'MATERIAL' as any,
        materialId: null,
        ferramentaId: null,
        quantidade: it.quantidade,
        quantidadeSolicitada: it.quantidade,
        quantidadeEntregue: 0,
        material: {
          id: '',
          codigo: it.codigo,
          descricao: it.descricao,
          unidadeConsumo: {
            id: '',
            sigla: it.unidadeMedida || 'UN',
            nome: it.unidadeMedida || 'UN',
          },
        } as any,
      })),
    }))
  }, [pendentes, usuario])

  const requisicoes = useMemo(() => {
    return [...requisicoesOfflineParaExibicao, ...requisicoesServidor]
  }, [requisicoesOfflineParaExibicao, requisicoesServidor])

  const { data: obrasServidor = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => getObras(true),
  })

  useEffect(() => {
    if (obrasServidor.length > 0) {
      salvarCacheObras(obrasServidor)
    }
  }, [obrasServidor])

  const obras = obrasServidor.length > 0 ? obrasServidor : obterCacheObras()

  const { data: areasServidor = [] } = useQuery({
    queryKey: ['areas-obra', obraIdSelecionada],
    queryFn: () => getAreasObra(obraIdSelecionada, true),
    enabled: !!obraIdSelecionada,
  })

  useEffect(() => {
    if (areasServidor.length > 0 && obraIdSelecionada) {
      try {
        localStorage.setItem(`obras_offline_areas_${obraIdSelecionada}`, JSON.stringify(areasServidor))
      } catch (e) {}
    }
  }, [areasServidor, obraIdSelecionada])

  const areas: AreaObra[] =
    areasServidor.length > 0
      ? areasServidor
      : (() => {
          if (!obraIdSelecionada) return []
          try {
            const raw = localStorage.getItem(`obras_offline_areas_${obraIdSelecionada}`)
            return raw ? JSON.parse(raw) : []
          } catch {
            return []
          }
        })()

  const { data: etapasAreaServidor = [] } = useQuery({
    queryKey: ['etapas-area', areaIdSelecionada],
    queryFn: () => (areaIdSelecionada ? getEtapasArea(areaIdSelecionada) : Promise.resolve([])),
    enabled: !!areaIdSelecionada,
  })

  useEffect(() => {
    if (etapasAreaServidor.length > 0 && areaIdSelecionada) {
      salvarCacheEtapas(areaIdSelecionada, etapasAreaServidor)
    }
  }, [etapasAreaServidor, areaIdSelecionada])

  const etapasArea =
    etapasAreaServidor.length > 0
      ? etapasAreaServidor
      : areaIdSelecionada
      ? obterCacheEtapas(areaIdSelecionada)
      : []

  const etapaSelecionada = etapasArea.find((e) => e.id === etapaIdSelecionada)
  const etapaEstaEncerrada = etapaSelecionada?.status === 'ENCERRADA'

  // Queries para o Modal de Exportacao Analitica (F04)
  const { data: areasExpObra = [] } = useQuery({
    queryKey: ['areas-obra-exp', expObraId],
    queryFn: () => (expObraId ? getAreasObra(expObraId, false) : Promise.resolve([])),
    enabled: Boolean(expObraId && modalExportacaoAnaliticaAberto),
  })

  const { data: etapasExpArea = [] } = useQuery({
    queryKey: ['etapas-area-exp', expAreaId],
    queryFn: () => (expAreaId ? getEtapasArea(expAreaId) : Promise.resolve([])),
    enabled: Boolean(expAreaId && modalExportacaoAnaliticaAberto),
  })

  const { data: saldosServidor = [] } = useQuery({
    queryKey: ['estoque-saldos-obra-modal', obraIdSelecionada],
    queryFn: () => getSaldosEstoque({ obraId: obraIdSelecionada }),
    enabled: !!obraIdSelecionada,
  })

  useEffect(() => {
    if (saldosServidor.length > 0 && obraIdSelecionada) {
      try {
        localStorage.setItem(`obras_offline_saldos_${obraIdSelecionada}`, JSON.stringify(saldosServidor))
      } catch (e) {}
    }
  }, [saldosServidor, obraIdSelecionada])

  const saldosObraModal =
    saldosServidor.length > 0
      ? saldosServidor
      : (() => {
          if (!obraIdSelecionada) return []
          try {
            const raw = localStorage.getItem(`obras_offline_saldos_${obraIdSelecionada}`)
            return raw ? JSON.parse(raw) : []
          } catch {
            return []
          }
        })()

  const { data: limitesOrcamentoObra = [] } = useQuery({
    queryKey: ['limites-orcamento-obra', obraIdSelecionada],
    queryFn: () => getLimitesOrcamentoObra(obraIdSelecionada),
    enabled: !!obraIdSelecionada,
  })

  const { data: todosLimitesOrcamento = [] } = useQuery({
    queryKey: ['limites-orcamento-todas-obras'],
    queryFn: () => getLimitesOrcamentoObra(),
  })

  const mapaLimitesOrcamento = (() => {
    const mapa = new Map<string, number>()
    for (const lim of limitesOrcamentoObra) {
      mapa.set(lim.materialId, Number(lim.quantidadeOrcada))
    }
    return mapa
  })()

  const mapaDetalhesOrcamentoModal = (() => {
    const mapa = new Map<
      string,
      { quantidadeOrcada: number; quantidadeConsumida: number; saldoOrcamento: number }
    >()
    for (const lim of limitesOrcamentoObra) {
      const orcada = Number(lim.quantidadeOrcada)
      const consumida =
        lim.quantidadeConsumida !== undefined ? Number(lim.quantidadeConsumida) : 0
      const saldo =
        lim.saldoOrcamento !== undefined
          ? Number(lim.saldoOrcamento)
          : Number((orcada - consumida).toFixed(4))
      mapa.set(lim.materialId, {
        quantidadeOrcada: orcada,
        quantidadeConsumida: consumida,
        saldoOrcamento: saldo,
      })
    }
    return mapa
  })()

  const mapaLimitesPorObraMaterial = (() => {
    const mapa = new Map<
      string,
      { quantidadeOrcada: number; quantidadeConsumida: number; saldoOrcamento: number }
    >()
    for (const lim of todosLimitesOrcamento) {
      const orcada = Number(lim.quantidadeOrcada)
      const consumida =
        lim.quantidadeConsumida !== undefined ? Number(lim.quantidadeConsumida) : 0
      const saldo =
        lim.saldoOrcamento !== undefined
          ? Number(lim.saldoOrcamento)
          : Number((orcada - consumida).toFixed(4))
      mapa.set(`${lim.obraId}:${lim.materialId}`, {
        quantidadeOrcada: orcada,
        quantidadeConsumida: consumida,
        saldoOrcamento: saldo,
      })
    }
    return mapa
  })()

  const { data: ferramentas = [] } = useQuery({
    queryKey: ['ferramentas-disponiveis'],
    queryFn: () => getFerramentas({ status: 'DISPONIVEL', somenteAtivas: true }),
  })

  // Itens em estoque na obra selecionada com saldo disponivel positivo (> 0)
  const materiaisEmEstoqueNaObra = (() => {
    const mapa = new Map<string, { material: any; disponivel: number }>()

    for (const s of saldosObraModal) {
      const disp = Number(s.disponivel)
      if (disp <= 0) continue

      const existente = mapa.get(s.materialId)
      if (existente) {
        existente.disponivel = Number((existente.disponivel + disp).toFixed(4))
      } else {
        mapa.set(s.materialId, {
          material: s.material,
          disponivel: disp,
        })
      }
    }

    return Array.from(mapa.values())
  })()

  // Mapa de saldo disponivel por materialId na obra selecionada
  const mapaSaldoFisicoModal = (() => {
    const mapa = new Map<string, { disponivel: number; material: any }>()
    for (const item of materiaisEmEstoqueNaObra) {
      mapa.set(item.material.id, item)
    }
    return mapa
  })()

  // Quantidade consolidada solicitada por materialId no formulario atual
  const mapaQtdSolicitadaModal = (() => {
    const mapa = new Map<string, number>()
    for (const linha of itensForm) {
      if (linha.tipo === 'MATERIAL' && linha.materialId && linha.quantidade > 0) {
        const atual = mapa.get(linha.materialId) || 0
        mapa.set(linha.materialId, Number((atual + Number(linha.quantidade)).toFixed(4)))
      }
    }
    return mapa
  })()

  // Avaliacao em tempo real de estouro de orcamento e saldo fisico no modal
  const alertasModalPorMaterial = (() => {
    const listaEstouroOrcamento: Array<{
      materialId: string
      codigo: string
      descricao: string
      sigla: string
      solicitado: number
      orcado: number
      consumido: number
      saldoOrcamento: number
      excedentePrevisto: number
    }> = []

    const listaFaltaEstoque: Array<{
      materialId: string
      codigo: string
      descricao: string
      sigla: string
      solicitado: number
      disponivel: number
    }> = []

    for (const [materialId, qtdSolicitada] of mapaQtdSolicitadaModal.entries()) {
      const infoEstoque = mapaSaldoFisicoModal.get(materialId)
      const mat = infoEstoque?.material
      const codigo = mat?.codigo || 'MAT'
      const descricao = mat?.descricao || 'Material'
      const sigla = mat?.unidadeConsumo?.sigla || 'UN'
      const disponivel = infoEstoque ? Number(infoEstoque.disponivel) : 0

      if (infoEstoque && qtdSolicitada > disponivel) {
        listaFaltaEstoque.push({
          materialId,
          codigo,
          descricao,
          sigla,
          solicitado: qtdSolicitada,
          disponivel,
        })
      }

      const infoOrc = mapaDetalhesOrcamentoModal.get(materialId)
      if (infoOrc) {
        const totalPosPedido = Number(
          (infoOrc.quantidadeConsumida + qtdSolicitada).toFixed(4)
        )
        if (
          qtdSolicitada > infoOrc.saldoOrcamento ||
          totalPosPedido > infoOrc.quantidadeOrcada
        ) {
          listaEstouroOrcamento.push({
            materialId,
            codigo,
            descricao,
            sigla,
            solicitado: qtdSolicitada,
            orcado: infoOrc.quantidadeOrcada,
            consumido: infoOrc.quantidadeConsumida,
            saldoOrcamento: infoOrc.saldoOrcamento,
            excedentePrevisto: Number(
              Math.max(0, totalPosPedido - infoOrc.quantidadeOrcada).toFixed(4)
            ),
          })
        }
      }
    }

    return { listaEstouroOrcamento, listaFaltaEstoque }
  })()

  function salvarLocalmenteOffline(payload: CriarRequisicaoInput) {
    const obraObj = obras.find((o) => o.id === obraIdSelecionada)
    const areaObj = areas.find((a) => a.id === areaIdSelecionada)
    const etapaObj = etapasArea.find((e) => e.id === etapaIdSelecionada)

    const itensExibicao = itensForm.map((it) => {
      if (it.tipo === 'MATERIAL') {
        const mat = mapaSaldoFisicoModal.get(it.materialId)?.material
        return {
          codigo: mat?.codigo || 'MAT',
          descricao: mat?.descricao || 'Material',
          quantidade: Number(it.quantidade),
          unidadeMedida: mat?.unidadeConsumo?.sigla || 'UN',
        }
      } else {
        const ferr = ferramentas.find((f) => f.id === it.ferramentaId)
        return {
          codigo: ferr?.codigo || 'FERR',
          descricao: ferr?.nome || 'Ferramenta',
          quantidade: Number(it.quantidade),
          unidadeMedida: 'UN',
        }
      }
    })

    salvarRequisicaoOffline({
      dados: payload,
      dadosExibicao: {
        obraNome: obraObj?.nome || obraObj?.codigo || 'Obra Canteiro',
        areaNome: areaObj?.nome || 'Area',
        etapaNome: etapaObj?.nome || 'Etapa',
        solicitanteNome: usuario?.nome || 'Encarregado',
        itens: itensExibicao,
      },
    })

    window.dispatchEvent(new Event('obras-offline-change'))
    setModalNovaRequisicaoAberto(false)
    limparForm()
    setMensagemFeedback(
      'Pedido salvo no dispositivo (Modo Offline). Sera sincronizado automaticamente assim que conectar.'
    )
  }

  // Mutations
  const criarRequisicaoMutation = useMutation({
    mutationFn: (dados: CriarRequisicaoInput) => createRequisicao(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setModalNovaRequisicaoAberto(false)
      limparForm()
      setMensagemFeedback('Requisicao enviada com sucesso!')
    },
    onError: (err: any, variables: CriarRequisicaoInput) => {
      // Se falhar por queda de rede ou servidor inacessivel, salva localmente
      if (!err?.response || err?.code === 'ERR_NETWORK') {
        salvarLocalmenteOffline(variables)
        return
      }
      setErroForm(extrairErro(err, 'Erro ao criar requisicao'))
    },
  })

  const atenderRequisicaoMutation = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: AtenderRequisicaoInput }) =>
      atenderRequisicao(id, dados),
    onSuccess: (reqAtendida) => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-saldos'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] })
      setRequisicaoEmAtendimento(null)
      setRetiradoPor('')
      setQtdsEntreguesMap({})
      setErroAtendimento(null)
      setErroFeedback(null)
      setMensagemFeedback(
        `Requisicao #${reqAtendida.numeroSequencial} atendida com sucesso. Retirado por: ${reqAtendida.retiradoPor}.`
      )
    },
    onError: (err: any) => {
      setErroAtendimento(extrairErro(err, 'Nao foi possivel atender a requisicao'))
    },
  })

  const exportarSiengeMutation = useMutation({
    mutationFn: (incluirJaExportadas: boolean) =>
      exportarRequisicoesSienge({ incluirJaExportadas }),
    onSuccess: (res) => {
      dispararDownloadCsv(res.csv, res.nomeArquivo)
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setErroFeedback(null)
      setMensagemFeedback(
        `Arquivo ${res.nomeArquivo} gerado com sucesso (${res.totalRequisicoes} requisicao(oes) marcada(s) como exportada(s) para o SIENGE).`
      )
    },
    onError: (err: any) => {
      setMensagemFeedback(null)
      setErroFeedback(extrairErro(err, 'Erro ao exportar requisicoes para o SIENGE'))
    },
  })

  const exportarAnaliticoMutation = useMutation({
    mutationFn: (dados: ExportarAnaliticoEngenhariaInput) => exportarAnaliticoEngenharia(dados),
    onSuccess: (res) => {
      dispararDownloadCsv(res.csv, res.nomeArquivo)
      setModalExportacaoAnaliticaAberto(false)
      setErroFeedback(null)
      setMensagemFeedback(
        `Relatorio analitico ${res.nomeArquivo} gerado com sucesso (${res.totalLinhas} itens em ${res.totalRequisicoes} requisicao(oes)).`
      )
    },
    onError: (err: any) => {
      setErroExportacaoAnalitica(extrairErro(err, 'Erro ao exportar relatorio analitico'))
    },
  })

  function handleAbrirModalExportacaoAnalitica() {
    const obraPadrao = usuario?.obraId || (obras.length === 1 ? obras[0].id : '')
    setExpObraId(obraPadrao)
    setExpAreaId('')
    setExpEtapaId('')
    setExpDataInicio('')
    setExpDataFim('')
    setExpStatus('TODAS')
    setExpBusca('')
    setErroExportacaoAnalitica(null)
    setModalExportacaoAnaliticaAberto(true)
  }

  function handleSubmeterExportacaoAnalitica(e: FormEvent) {
    e.preventDefault()
    setErroExportacaoAnalitica(null)

    exportarAnaliticoMutation.mutate({
      obraId: expObraId || undefined,
      areaId: expAreaId || undefined,
      etapaId: expEtapaId || undefined,
      dataInicio: expDataInicio || undefined,
      dataFim: expDataFim || undefined,
      status: expStatus !== 'TODAS' ? (expStatus as StatusRequisicao) : undefined,
      busca: expBusca.trim() || undefined,
    })
  }

  const cancelarRequisicaoMutation = useMutation({
    mutationFn: (id: string) => cancelarRequisicao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
    },
    onError: (err: any) => {
      setErroFeedback(extrairErro(err, 'Nao foi possivel cancelar a requisicao'))
    },
  })

  function limparForm() {
    const obraPadrao = usuario?.obraId || (obras.length === 1 ? obras[0].id : '')
    setObraIdSelecionada(obraPadrao)
    setAreaIdSelecionada('')
    setEtapaIdSelecionada('')
    setObservacao('')
    setItensForm([{ tipo: 'MATERIAL', materialId: '', ferramentaId: '', quantidade: 1 }])
    setChaveIdempotencia(gerarChaveIdempotencia())
    setErroForm(null)
  }

  function handleAbrirModal() {
    limparForm()
    const obraPadrao = usuario?.obraId || (obras.length === 1 ? obras[0].id : '')
    setObraIdSelecionada(obraPadrao)
    setModalNovaRequisicaoAberto(true)
  }

  function handleAbrirModalAtendimento(req: Requisicao) {
    setRequisicaoEmAtendimento(req)
    setRetiradoPor('')
    setErroAtendimento(null)
    const mapaInicial: Record<string, string> = {}
    for (const it of req.itens) {
      mapaInicial[it.id] = String(Number(it.quantidade))
    }
    setQtdsEntreguesMap(mapaInicial)
  }

  function handleSubmeterAtendimento(e: FormEvent) {
    e.preventDefault()
    if (!requisicaoEmAtendimento) return
    setErroAtendimento(null)

    if (retiradoPor.trim().length < 2) {
      setErroAtendimento('Informe o nome de quem esta retirando o material na obra')
      return
    }

    const itensPayload = requisicaoEmAtendimento.itens.map((it) => {
      const valorDigitado = parseFloat(qtdsEntreguesMap[it.id] ?? String(it.quantidade))
      return {
        itemId: it.id,
        quantidadeEntregue: isNaN(valorDigitado) ? 0 : valorDigitado,
      }
    })

    if (itensPayload.some((i) => i.quantidadeEntregue < 0)) {
      setErroAtendimento('A quantidade entregue nao pode ser negativa')
      return
    }

    if (itensPayload.every((i) => i.quantidadeEntregue <= 0)) {
      setErroAtendimento('Informe quantidade entregue maior que zero para ao menos um item')
      return
    }

    atenderRequisicaoMutation.mutate({
      id: requisicaoEmAtendimento.id,
      dados: {
        retiradoPor: retiradoPor.trim(),
        itens: itensPayload,
      },
    })
  }

  function handleAdicionarItem() {
    setItensForm((prev) => [
      ...prev,
      { tipo: 'MATERIAL', materialId: '', ferramentaId: '', quantidade: 1 },
    ])
  }

  function handleRemoverItem(index: number) {
    if (itensForm.length <= 1) return
    setItensForm((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAtualizarItem(index: number, campo: keyof ItemLinhaForm, valor: any) {
    setItensForm((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it
        const atualizado = { ...it, [campo]: valor }
        if (campo === 'tipo') {
          atualizado.materialId = ''
          atualizado.ferramentaId = ''
          atualizado.quantidade = 1
        }
        return atualizado
      })
    )
  }

  function handleCriarRequisicao(e: FormEvent) {
    e.preventDefault()
    setErroForm(null)

    if (!areaIdSelecionada) {
      setErroForm('Selecione a obra e a area/pavimento de aplicacao')
      return
    }

    if (!etapaIdSelecionada) {
      setErroForm('Selecione a etapa de execucao da obra')
      return
    }

    if (itensForm.length === 0) {
      setErroForm('Adicione ao menos um item a requisicao')
      return
    }

    for (let i = 0; i < itensForm.length; i++) {
      const it = itensForm[i]
      if (it.tipo === 'MATERIAL' && !it.materialId) {
        setErroForm(`Selecione o material no item ${i + 1}`)
        return
      }
      if (it.tipo === 'FERRAMENTA' && !it.ferramentaId) {
        setErroForm(`Selecione a ferramenta no item ${i + 1}`)
        return
      }
      if (it.quantidade <= 0) {
        setErroForm(`Informe uma quantidade valida no item ${i + 1}`)
        return
      }
    }

    if (etapaEstaEncerrada) {
      setErroForm(`A etapa "${etapaSelecionada?.nome}" esta encerrada e nao aceita novos pedidos de material`)
      return
    }

    const payload: CriarRequisicaoInput = {
      areaId: areaIdSelecionada,
      etapaId: etapaIdSelecionada,
      observacao: observacao.trim() || undefined,
      chaveIdempotencia,
      itens: itensForm.map((it) => ({
        materialId: it.tipo === 'MATERIAL' ? it.materialId : null,
        ferramentaId: it.tipo === 'FERRAMENTA' ? it.ferramentaId : null,
        quantidade: Number(it.quantidade),
      })),
    }

    // Se estiver explicitamente offline pelo navegador
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      salvarLocalmenteOffline(payload)
      return
    }

    criarRequisicaoMutation.mutate(payload)
  }

  // Contagem de atendidas pendentes de exportacao para o SIENGE
  const qtdPendentesSienge = requisicoes.filter(
    (r) => r.status === 'ATENDIDA' && !r.exportadaSienge
  ).length

  // Filtragem
  const requisicoesFiltradas = requisicoes.filter((r) => {
    if (ocultarAtendidas && r.status === 'ATENDIDA') {
      return false
    }

    if (filtroStatus !== 'TODAS' && r.status !== filtroStatus) {
      return false
    }

    if (podeAtenderEExportar && filtroSienge !== 'TODAS') {
      if (filtroSienge === 'PENDENTES' && (r.status !== 'ATENDIDA' || r.exportadaSienge)) {
        return false
      }
      if (filtroSienge === 'EXPORTADAS' && !r.exportadaSienge) {
        return false
      }
    }

    if (!busca.trim()) return true

    const termo = busca.toLowerCase()
    const num = `#${r.numeroSequencial}`
    const obraNome = r.area?.obra?.nome?.toLowerCase() || ''
    const areaNome = r.area?.nome?.toLowerCase() || ''
    const etapaNome = r.etapa?.nome?.toLowerCase() || ''
    const reqNome = r.requisitante?.nome?.toLowerCase() || ''
    const retiradoNome = r.retiradoPor?.toLowerCase() || ''
    const obs = r.observacao?.toLowerCase() || ''

    return (
      num.includes(termo) ||
      obraNome.includes(termo) ||
      areaNome.includes(termo) ||
      etapaNome.includes(termo) ||
      reqNome.includes(termo) ||
      retiradoNome.includes(termo) ||
      obs.includes(termo)
    )
  })

  function badgeStatus(status: StatusRequisicao): { badgeClass: string; texto: string } {
    switch (status) {
      case 'PENDENTE_SINCRONIZACAO' as any:
        return {
          badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40',
          texto: 'Offline (Pendente Sync)',
        }
      case 'SOLICITADA':
        return { badgeClass: 'ob-badge--low', texto: 'Pendente (Aguardando Almoxarifado)' }
      case 'EM_SEPARACAO':
        return { badgeClass: 'ob-badge--info', texto: 'Em Separacao' }
      case 'PRONTA':
        return { badgeClass: 'ob-badge--ok', texto: 'Pronta para Retirada' }
      case 'ATENDIDA':
        return { badgeClass: 'ob-badge--ok', texto: 'Atendida / Entregue' }
      case 'CANCELADA':
        return { badgeClass: 'ob-badge--crit', texto: 'Cancelada' }
      default:
        return { badgeClass: 'ob-badge--low', texto: String(status) }
    }
  }

  return (
    <main className="flex flex-col w-full min-h-screen bg-surface pb-28 font-body text-on-surface">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex flex-col gap-6">
        {/* Cabecalho Nativo */}
        <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">
              Controle de Canteiro
            </span>
            <h1 className="ob-heading text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-0.5">
              {ehEncarregado ? 'Minhas Requisicoes de Obra' : 'Requisicoes de Obra'}
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant font-body">
              {ehEncarregado
                ? 'Solicite materiais e ferramentas disponiveis no estoque da obra e acompanhe seus pedidos'
                : 'Atenda requisicoes com baixa automatica no estoque e exporte os registros atendidos para o SIENGE'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {podeExportarAnalitico && (
              <button
                type="button"
                onClick={handleAbrirModalExportacaoAnalitica}
                className="ob-btn ob-btn--outline ob-btn--sm min-h-[48px]"
              >
                <span className="material-symbols-outlined text-[18px]">analytics</span>
                <span>Exportacao Analitica (Engenharia)</span>
              </button>
            )}

            {podeAtenderEExportar && (
              <button
                type="button"
                disabled={exportarSiengeMutation.isPending}
                onClick={() => {
                  setMensagemFeedback(null)
                  setErroFeedback(null)
                  const reexportar = filtroSienge === 'EXPORTADAS'
                  exportarSiengeMutation.mutate(reexportar)
                }}
                className="ob-btn ob-btn--outline ob-btn--sm min-h-[48px]"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                <span>
                  {exportarSiengeMutation.isPending
                    ? 'Exportando CSV...'
                    : `Exportar para SIENGE (CSV)${qtdPendentesSienge > 0 ? ` [${qtdPendentesSienge}]` : ''}`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAbrirModal}
              className="ob-btn ob-btn--primary ob-btn--sm min-h-[48px]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Nova Requisicao</span>
            </button>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {mensagemFeedback && (
          <div className="bg-secondary-container text-on-secondary-container border border-secondary/20 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm animate-fade-up">
            <span className="font-medium">{mensagemFeedback}</span>
            <button
              type="button"
              onClick={() => setMensagemFeedback(null)}
              className="text-on-secondary-container font-bold text-lg hover:opacity-70 px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {erroFeedback && (
          <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm animate-fade-up">
            <span className="font-medium">{erroFeedback}</span>
            <button
              type="button"
              onClick={() => setErroFeedback(null)}
              className="text-on-error-container font-bold text-lg hover:opacity-70 px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Summary Spark Card */}
        <div className="ob-card p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shadow-sm">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Pico matinal no Almoxarifado</p>
              <p className="text-xs text-on-surface-variant font-mono">
                Tempo médio de espera atual: 8 minutos • Separação rápida ativa
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-accent-text text-[22px]">bolt</span>
        </div>

        {/* Barra de Filtros: Tabs + Search */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="overflow-x-auto max-w-full pb-1">
            <div className="ob-tabs" role="tablist">
              {[
                { id: 'TODAS', label: 'Todas' },
                { id: 'SOLICITADA', label: 'Pendentes' },
                { id: 'ATENDIDA', label: 'Atendidas' },
                { id: 'CANCELADA', label: 'Canceladas' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  role="tab"
                  aria-selected={filtroStatus === st.id}
                  onClick={() => setFiltroStatus(st.id)}
                  className="ob-tab"
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="ob-search flex-1 sm:w-64">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Buscar por #101, obra, solicitante..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="ob-input text-xs sm:text-sm"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-xl border border-surface-container cursor-pointer select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={ocultarAtendidas}
                onChange={(e) => setOcultarAtendidas(e.target.checked)}
                className="w-4 h-4 rounded text-accent-text"
              />
              <span>Ocultar ja atendidas</span>
            </label>

            {podeAtenderEExportar && (
              <select
                aria-label="Filtrar por status de exportacao SIENGE"
                value={filtroSienge}
                onChange={(e) => setFiltroSienge(e.target.value as any)}
                className="ob-input px-3 py-2 text-xs w-auto min-h-[44px]"
              >
                <option value="TODAS">SIENGE: Todas</option>
                <option value="PENDENTES">SIENGE: Pendentes</option>
                <option value="EXPORTADAS">SIENGE: Exportadas</option>
              </select>
            )}
          </div>
        </div>

        {/* Lista de Requisicoes */}
        {carregandoRequisicoes ? (
          <div className="p-12 text-center text-sm text-on-surface-variant font-body">
            Carregando requisicoes...
          </div>
        ) : requisicoesFiltradas.length === 0 ? (
          <div className="ob-card p-8 text-center text-sm text-on-surface-variant border border-dashed border-surface-container">
            Nenhuma requisicao encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {requisicoesFiltradas.map((r) => {
              const statusConfig = badgeStatus(r.status)
              const podeCancelar =
                r.status === 'SOLICITADA' &&
                (usuario?.id === r.requisitanteId || podeAtenderEExportar)
              const podeAtender = r.status === 'SOLICITADA' && podeAtenderEExportar

              return (
                <div
                  key={r.id}
                  className="ob-card p-4 sm:p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Linha Superior: #REQ e Status */}
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-accent-text tracking-tight">
                        {r.numeroSequencial > 0 ? `#${r.numeroSequencial}` : '#OFFLINE'}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                      <span className={`ob-badge ${statusConfig.badgeClass}`}>
                        {statusConfig.texto}
                      </span>

                      {podeAtenderEExportar && r.status === 'ATENDIDA' && (
                        <span
                          className={`ob-badge ${
                            r.exportadaSienge ? 'ob-badge--ok' : 'ob-badge--low'
                          }`}
                        >
                          {r.exportadaSienge ? 'Exportada SIENGE' : 'Pendente Exportacao SIENGE'}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-on-surface-variant font-mono tabular-nums">
                      Solicitado em: {new Date(r.solicitadaEm).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Localizacao, Solicitante e Retirada */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-surface-container-low p-3 rounded-xl text-xs sm:text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[17px] text-primary">
                        apartment
                      </span>
                      <span className="text-on-surface-variant">Obra / Destino:</span>
                      <strong className="text-on-surface truncate">
                        {r.area?.obra?.codigo} &bull; {r.area?.nome}
                      </strong>
                      {r.etapa && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          r.etapa.status === 'ENCERRADA'
                            ? 'bg-surface-container-high text-on-surface-variant'
                            : 'bg-primary-container text-on-primary-container'
                        }`}>
                          Etapa: {r.etapa.nome}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[17px] text-primary">
                        engineering
                      </span>
                      <span className="text-on-surface-variant">Solicitante:</span>
                      <strong className="text-on-surface truncate">{r.requisitante?.nome}</strong>
                    </div>

                    {r.status === 'ATENDIDA' && r.retiradoPor && (
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[17px] text-secondary">
                          badge
                        </span>
                        <span className="text-on-surface-variant">Retirado na obra por:</span>
                        <strong className="text-secondary truncate">{r.retiradoPor}</strong>
                      </div>
                    )}
                  </div>

                  {/* Itens Requisitados */}
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-surface-container">
                    <div className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">
                      Itens da Requisicao ({r.itens.length}):
                    </div>
                    <ul className="m-0 pl-4 text-xs sm:text-sm text-on-surface space-y-1">
                      {r.itens.map((it) => {
                        const qtdSol = Number(it.quantidade)
                        const temEntregue =
                          it.quantidadeEntregue !== null && it.quantidadeEntregue !== undefined
                        const qtdEnt = temEntregue ? Number(it.quantidadeEntregue) : null

                        const obraItemId = r.area?.obra?.id || r.area?.obraId
                        const infoOrcCard =
                          obraItemId && it.materialId
                            ? mapaLimitesPorObraMaterial.get(`${obraItemId}:${it.materialId}`)
                            : undefined
                        const excedeLimiteCard = Boolean(
                          infoOrcCard &&
                            r.status !== 'CANCELADA' &&
                            (qtdSol > infoOrcCard.quantidadeOrcada ||
                              infoOrcCard.quantidadeConsumida > infoOrcCard.quantidadeOrcada)
                        )

                        return (
                          <li key={it.id}>
                            {it.material ? (
                              <span>
                                {r.status === 'ATENDIDA' && qtdEnt !== null ? (
                                  <span>
                                    <strong>
                                      Solicitado: {qtdSol} {it.material.unidadeConsumo.sigla} |
                                      Entregue: {qtdEnt} {it.material.unidadeConsumo.sigla}
                                    </strong>{' '}
                                    &mdash; {it.material.descricao}{' '}
                                    <span className="text-on-surface-variant">
                                      ({it.material.codigo})
                                    </span>
                                  </span>
                                ) : (
                                  <span>
                                    <strong>
                                      {qtdSol} {it.material.unidadeConsumo.sigla}
                                    </strong>{' '}
                                    &mdash; {it.material.descricao}{' '}
                                    <span className="text-on-surface-variant">
                                      ({it.material.codigo})
                                    </span>
                                  </span>
                                )}
                                {excedeLimiteCard && infoOrcCard && (
                                  <span className="ml-2 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold">
                                    Excede Limite Orcado ({infoOrcCard.quantidadeOrcada}{' '}
                                    {it.material.unidadeConsumo.sigla})
                                  </span>
                                )}
                              </span>
                            ) : it.ferramenta ? (
                              <span>
                                <strong>1 un</strong> &mdash; {it.ferramenta.nome}{' '}
                                <span className="text-on-surface-variant">
                                  [Ferramenta cod: {it.ferramenta.codigo}]
                                </span>
                              </span>
                            ) : (
                              <span>Item nao especificado</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {/* Observações e Ações do Card */}
                  <div className="flex flex-wrap justify-between items-center gap-2 pt-1 border-t border-surface-container">
                    <span className="text-xs text-on-surface-variant italic truncate max-w-md">
                      {r.observacao ? `Obs: ${r.observacao}` : 'Sem observacoes adicionais'}
                    </span>

                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                      {podeAtender && (
                        <button
                          type="button"
                          onClick={() => handleAbrirModalAtendimento(r)}
                          className="ob-btn ob-btn--primary ob-btn--sm min-h-[44px]"
                        >
                          Atender / Entregar Material
                        </button>
                      )}

                      {podeCancelar && (
                        <button
                          type="button"
                          disabled={cancelarRequisicaoMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Deseja cancelar a requisicao #${r.numeroSequencial}?`
                              )
                            ) {
                              cancelarRequisicaoMutation.mutate(r.id)
                            }
                          }}
                          className="ob-btn ob-btn--outline ob-btn--sm min-h-[44px] text-error border-error/30 hover:bg-error-container/20"
                        >
                          Cancelar Requisicao
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL: ATENDER REQUISICAO (ALMOXARIFE / ADMIN) */}
      {requisicaoEmAtendimento && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h2 className="ob-heading text-xl font-bold text-on-surface mb-2">
              Atender Requisicao #{requisicaoEmAtendimento.numeroSequencial}
            </h2>
            <p className="text-sm text-on-surface-variant mb-4 font-body">
              Confirme ou ajuste as quantidades entregues e informe o nome de quem esta retirando o material na obra.
            </p>

            <div className="bg-surface-container-low border border-surface-container rounded-xl p-4 mb-4 text-sm text-on-surface space-y-1">
              <div>
                <strong>Obra / Area:</strong> {requisicaoEmAtendimento.area?.obra?.codigo} -{' '}
                {requisicaoEmAtendimento.area?.obra?.nome} &bull; {requisicaoEmAtendimento.area?.nome}
              </div>
              <div>
                <strong>Solicitante:</strong> {requisicaoEmAtendimento.requisitante?.nome}
              </div>
            </div>

            {erroAtendimento && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-4 text-sm">
                {erroAtendimento}
              </div>
            )}

            <form onSubmit={handleSubmeterAtendimento} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2 font-body">
                  Itens e Quantidades Entregues
                </label>

                <div className="flex flex-col gap-2">
                  {requisicaoEmAtendimento.itens.map((it) => {
                    const sigla = it.material?.unidadeConsumo?.sigla || 'UN'
                    return (
                      <div
                        key={it.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3 items-center bg-surface-container-low p-3.5 rounded-xl border border-surface-container"
                      >
                        <div>
                          <div className="font-semibold text-sm text-on-surface">
                            {it.material
                              ? `${it.material.codigo} - ${it.material.descricao}`
                              : `${it.ferramenta?.codigo} - ${it.ferramenta?.nome}`}
                          </div>
                          <div className="text-xs text-on-surface-variant font-mono tabular-nums">
                            Quantidade solicitada: <strong>{Number(it.quantidade)} {sigla}</strong>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-on-surface-variant mb-1 font-body">
                            Qtd Entregue ({sigla})
                          </label>
                          <input
                            aria-label={`Quantidade entregue para ${it.material?.descricao || it.ferramenta?.nome}`}
                            type="number"
                            min="0"
                            step="any"
                            required
                            disabled={Boolean(it.ferramenta)}
                            value={qtdsEntreguesMap[it.id] ?? String(Number(it.quantidade))}
                            onChange={(e) =>
                              setQtdsEntreguesMap((prev) => ({
                                ...prev,
                                [it.id]: e.target.value,
                              }))
                            }
                            className="ob-input font-mono tabular-nums text-sm py-2 px-3 w-full disabled:opacity-60"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2 font-body">
                  Retirado por (Responsavel pelo recebimento na obra)
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="ex: Jose da Silva - Pedreiro"
                  value={retiradoPor}
                  onChange={(e) => setRetiradoPor(e.target.value)}
                  className="ob-input text-sm w-full font-body"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequisicaoEmAtendimento(null)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={atenderRequisicaoMutation.isPending}
                  className="ob-btn ob-btn--primary"
                >
                  {atenderRequisicaoMutation.isPending
                    ? 'Confirmando...'
                    : 'Confirmar Entrega e Baixar Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA REQUISICAO */}
      {modalNovaRequisicaoAberto && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h2 className="ob-heading text-xl sm:text-2xl font-bold text-on-surface mb-2">
              Nova Requisicao de Obra
            </h2>
            <p className="text-sm text-on-surface-variant mb-4 font-body">
              Informe o destino da aplicacao e adicione os materiais (limitados ao saldo disponivel no estoque da obra) ou ferramentas.
            </p>

            {erroForm && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-4 text-sm font-body">
                {erroForm}
              </div>
            )}

            <form onSubmit={handleCriarRequisicao} className="flex flex-col gap-4">
              {/* Selecao da Obra, Area e Etapa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                    Obra
                  </label>
                  {usuario?.obraId || obras.length === 1 ? (
                    <div className="ob-input w-full text-sm font-body py-2.5 px-3 bg-surface-container text-on-surface font-semibold flex items-center justify-between">
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
                      value={obraIdSelecionada}
                      onChange={(e) => {
                        setObraIdSelecionada(e.target.value)
                        setAreaIdSelecionada('')
                        setEtapaIdSelecionada('')
                      }}
                      required
                      className="ob-input w-full text-sm font-body"
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
                  <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                    Area / Pavimento de Destino
                  </label>
                  <select
                    value={areaIdSelecionada}
                    onChange={(e) => {
                      setAreaIdSelecionada(e.target.value)
                      setEtapaIdSelecionada('')
                    }}
                    required
                    disabled={!obraIdSelecionada}
                    className="ob-input w-full text-sm disabled:opacity-50 font-body"
                  >
                    <option value="">
                      {!obraIdSelecionada ? 'Selecione a obra primeiro' : 'Selecione a area...'}
                    </option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                    Etapa de Execucao <span className="text-error">*</span>
                  </label>
                  <select
                    value={etapaIdSelecionada}
                    onChange={(e) => setEtapaIdSelecionada(e.target.value)}
                    required
                    disabled={!areaIdSelecionada || etapasArea.length === 0}
                    className="ob-input w-full text-sm disabled:opacity-50 font-body"
                  >
                    <option value="">
                      {!areaIdSelecionada
                        ? 'Selecione a area primeiro'
                        : etapasArea.length === 0
                          ? 'Nenhuma etapa cadastrada nesta area'
                          : 'Selecione a etapa...'}
                    </option>
                    {etapasArea.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.nome} {et.status === 'ENCERRADA' ? '(Encerrada - Bloqueada)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {etapaEstaEncerrada && (
                <div className="bg-error-container text-on-error-container border border-error/30 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">lock</span>
                  <span>
                    A etapa &quot;{etapaSelecionada?.nome}&quot; foi marcada como ENCERRADA pela Engenharia. O envio de novos pedidos para esta etapa esta bloqueado.
                  </span>
                </div>
              )}

              {/* Itens do Pedido */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-on-surface font-body">
                    Itens Solicitados
                  </label>
                  <button
                    type="button"
                    onClick={handleAdicionarItem}
                    className="text-xs sm:text-sm font-semibold text-accent-text hover:underline cursor-pointer"
                  >
                    + Adicionar Outro Item
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {itensForm.map((linha, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-[105px_minmax(0,1fr)_100px_32px] gap-2 items-center bg-surface-container-low p-2.5 rounded-xl border border-surface-container"
                    >
                      {/* Tipo */}
                      <select
                        value={linha.tipo}
                        onChange={(e) => handleAtualizarItem(idx, 'tipo', e.target.value)}
                        className="ob-input text-xs sm:text-sm py-2 px-2 font-body"
                      >
                        <option value="MATERIAL">Material</option>
                        <option value="FERRAMENTA">Ferramenta</option>
                      </select>

                      {/* Select Item Pesquisavel */}
                      {linha.tipo === 'MATERIAL' ? (
                        <SeletorItemPesquisavel
                          itens={materiaisEmEstoqueNaObra.map(({ material: m, disponivel }) => ({
                            id: m.id,
                            codigo: m.codigo,
                            descricao: m.descricao,
                            unidade: m.unidadeConsumo?.sigla,
                            saldoDisponivel: disponivel,
                            limiteOrcamento: mapaLimitesOrcamento.get(m.id),
                            detalheExtra: m.categoria?.nome ? `Categoria: ${m.categoria.nome}` : undefined,
                          }))}
                          valorSelecionadoId={linha.materialId}
                          onSelecionar={(id) => handleAtualizarItem(idx, 'materialId', id)}
                          placeholder={
                            !obraIdSelecionada
                              ? 'Selecione a obra primeiro para carregar o estoque...'
                              : materiaisEmEstoqueNaObra.length === 0
                                ? 'Nenhum material com saldo em estoque nesta obra'
                                : 'Digite codigo ou descricao do material em estoque...'
                          }
                          desabilitado={!obraIdSelecionada || materiaisEmEstoqueNaObra.length === 0}
                          obrigatorio
                          labelAria={`Selecionar material item ${idx + 1}`}
                        />
                      ) : (
                        <SeletorItemPesquisavel
                          itens={ferramentas.map((f) => ({
                            id: f.id,
                            codigo: f.codigo,
                            descricao: f.nome,
                            detalheExtra: `Status: ${f.status}`,
                          }))}
                          valorSelecionadoId={linha.ferramentaId}
                          onSelecionar={(id) => handleAtualizarItem(idx, 'ferramentaId', id)}
                          placeholder="Digite codigo ou nome da ferramenta..."
                          obrigatorio
                          labelAria={`Selecionar ferramenta item ${idx + 1}`}
                        />
                      )}

                      {/* Quantidade */}
                      <div>
                        {linha.tipo === 'MATERIAL' ? (
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            required
                            placeholder="Qtd"
                            value={linha.quantidade}
                            onChange={(e) => handleAtualizarItem(idx, 'quantidade', parseFloat(e.target.value) || 0)}
                            className="ob-input font-mono tabular-nums text-xs sm:text-sm py-2 px-2 w-full"
                          />
                        ) : (
                          <span className="text-xs text-on-surface-variant font-mono text-center block">
                            1 unidade
                          </span>
                        )}
                      </div>

                      {/* Botao Excluir Linha */}
                      {itensForm.length > 1 ? (
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(idx)}
                            className="text-error hover:text-on-error-container text-lg font-bold p-1 cursor-pointer"
                            aria-label="Remover item"
                          >
                            &times;
                          </button>
                        </div>
                      ) : <div />}
                    </div>
                  ))}
                </div>

                {/* Alertas em Tempo Real: Saldo Fisico e Limite de Orcamento da Engenharia */}
                {alertasModalPorMaterial.listaFaltaEstoque.length > 0 && (
                  <div
                    role="alert"
                    className="mt-4 bg-error-container text-on-error-container border border-error/20 rounded-xl p-4 text-sm font-body"
                  >
                    <strong className="block mb-2 font-bold">
                      Saldo fisico insuficiente no estoque da obra (Bloqueio de emissao):
                    </strong>
                    <ul className="m-0 pl-4 list-disc space-y-1">
                      {alertasModalPorMaterial.listaFaltaEstoque.map((al) => (
                        <li key={al.materialId}>
                          <strong>
                            {al.codigo} - {al.descricao}:
                          </strong>{' '}
                          solicitado <span className="font-mono tabular-nums">{al.solicitado}</span> {al.sigla}, mas ha apenas{' '}
                          <strong className="font-mono tabular-nums">
                            {al.disponivel} {al.sigla}
                          </strong>{' '}
                          disponiveis no almoxarifado desta obra.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {alertasModalPorMaterial.listaEstouroOrcamento.length > 0 && (
                  <div
                    role="status"
                    className="mt-4 bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary/20 rounded-xl p-4 text-sm font-body"
                  >
                    <strong className="block mb-2 font-bold">
                      Alerta da Engenharia: Estouro de Orcamento Previsto na Obra
                    </strong>
                    <p className="mb-2 text-xs sm:text-sm opacity-90 font-body">
                      A quantidade solicitada ultrapassa o teto orcado pela Engenharia. O pedido
                      podera ser enviado se houver saldo fisico, mas ficara destacado no Painel de
                      Estouro de Orcamento:
                    </p>
                    <ul className="m-0 pl-4 list-disc space-y-1 text-xs sm:text-sm font-mono tabular-nums">
                      {alertasModalPorMaterial.listaEstouroOrcamento.map((al) => (
                        <li key={al.materialId}>
                          <strong>
                            {al.codigo} - {al.descricao}:
                          </strong>{' '}
                          solicitando {al.solicitado} {al.sigla} (Orcado: {al.orcado} {al.sigla} |
                          Ja consumido: {al.consumido} {al.sigla} | Saldo orcado restante:{' '}
                          {al.saldoOrcamento} {al.sigla} | Excedente: +{al.excedentePrevisto}{' '}
                          {al.sigla}).
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Observacao */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Observacao (opcional)
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="ex: Urgente para a concretagem do bloco norte"
                  className="ob-input text-sm w-full font-body"
                />
              </div>

              {/* Botoes do Modal */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNovaRequisicaoAberto(false)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarRequisicaoMutation.isPending || !etapaIdSelecionada || etapaEstaEncerrada}
                  className="ob-btn ob-btn--primary ob-btn--lg"
                >
                  {criarRequisicaoMutation.isPending ? 'Enviando...' : 'Enviar Requisicao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EXPORTACAO ANALITICA PARA ENGENHARIA (F04) */}
      {modalExportacaoAnaliticaAberto && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="ob-heading text-xl sm:text-2xl font-bold text-on-surface">
                  Exportacao Analitica para Engenharia
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1 font-body">
                  Gere e baixe a planilha analitica consolidada em formato CSV com filtros por periodo, obra, area, etapa de execucao e insumo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalExportacaoAnaliticaAberto(false)}
                className="text-on-surface-variant hover:text-on-surface text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {erroExportacaoAnalitica && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl my-4 text-sm font-body">
                {erroExportacaoAnalitica}
              </div>
            )}

            <form onSubmit={handleSubmeterExportacaoAnalitica} className="flex flex-col gap-4 mt-4">
              {/* Filtro: Obra, Area e Etapa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 font-body">
                    Obra
                  </label>
                  {usuario?.obraId || obras.length === 1 ? (
                    <div className="ob-input w-full text-xs font-body py-2 px-3 bg-surface-container text-on-surface font-semibold flex items-center justify-between">
                      <span className="truncate">
                        {usuario?.obra
                          ? `${usuario.obra.codigo} - ${usuario.obra.nome}`
                          : obras[0]
                            ? `${obras[0].codigo} - ${obras[0].nome}`
                            : 'Obra'}
                      </span>
                      <span className="text-[10px] text-secondary font-normal">(Fixa)</span>
                    </div>
                  ) : (
                    <select
                      value={expObraId}
                      onChange={(e) => {
                        setExpObraId(e.target.value)
                        setExpAreaId('')
                        setExpEtapaId('')
                      }}
                      className="ob-input w-full text-xs font-body"
                    >
                      <option value="">Todas as Obras</option>
                      {obras.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.codigo} - {o.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 font-body">
                    Area / Pavimento
                  </label>
                  <select
                    value={expAreaId}
                    onChange={(e) => {
                      setExpAreaId(e.target.value)
                      setExpEtapaId('')
                    }}
                    disabled={!expObraId}
                    className="ob-input w-full text-xs disabled:opacity-50 font-body"
                  >
                    <option value="">
                      {!expObraId ? 'Selecione a obra primeiro' : 'Todas as Areas'}
                    </option>
                    {areasExpObra.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 font-body">
                    Etapa de Execucao
                  </label>
                  <select
                    value={expEtapaId}
                    onChange={(e) => setExpEtapaId(e.target.value)}
                    disabled={!expAreaId || etapasExpArea.length === 0}
                    className="ob-input w-full text-xs disabled:opacity-50 font-body"
                  >
                    <option value="">
                      {!expAreaId
                        ? 'Selecione a area primeiro'
                        : etapasExpArea.length === 0
                          ? 'Nenhuma etapa cadastrada'
                          : 'Todas as Etapas'}
                    </option>
                    {etapasExpArea.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.nome} {et.status === 'ENCERRADA' ? '(Encerrada)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filtro: Periodo (Data Inicio e Fim) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-data-inicio" className="block text-xs font-semibold text-on-surface mb-1 font-body">
                    Data Inicial (Solicitada a partir de)
                  </label>
                  <input
                    id="exp-data-inicio"
                    type="date"
                    value={expDataInicio}
                    onChange={(e) => setExpDataInicio(e.target.value)}
                    className="ob-input w-full text-xs font-body"
                  />
                </div>

                <div>
                  <label htmlFor="exp-data-fim" className="block text-xs font-semibold text-on-surface mb-1 font-body">
                    Data Final (Solicitada ate)
                  </label>
                  <input
                    id="exp-data-fim"
                    type="date"
                    value={expDataFim}
                    onChange={(e) => setExpDataFim(e.target.value)}
                    className="ob-input w-full text-xs font-body"
                  />
                </div>
              </div>

              {/* Filtro: Status e Busca */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 font-body">
                    Status da Requisicao
                  </label>
                  <select
                    value={expStatus}
                    onChange={(e) => setExpStatus(e.target.value)}
                    className="ob-input w-full text-xs font-body"
                  >
                    <option value="TODAS">Todos os Status</option>
                    <option value="ATENDIDA">Apenas Atendidas (Entregues)</option>
                    <option value="SOLICITADA">Solicitadas (Pendentes)</option>
                    <option value="EM_SEPARACAO">Em Separacao</option>
                    <option value="PRONTA">Prontas para Retirada</option>
                    <option value="CANCELADA">Canceladas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 font-body">
                    Filtro por Insumo ou Solicitante
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Cimento, Furadeira, Carlos..."
                    value={expBusca}
                    onChange={(e) => setExpBusca(e.target.value)}
                    className="ob-input w-full text-xs font-body"
                  />
                </div>
              </div>

              <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container text-xs text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">info</span>
                <span>
                  O arquivo CSV gerado contera codigo Jooy, codigo SIENGE, etapa da obra, quantidades solicitadas vs entregues, datas e responsaveis.
                </span>
              </div>

              {/* Botoes do Modal */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalExportacaoAnaliticaAberto(false)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={exportarAnaliticoMutation.isPending}
                  className="ob-btn ob-btn--primary ob-btn--lg"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>
                    {exportarAnaliticoMutation.isPending
                      ? 'Processando Planilha...'
                      : 'Baixar Relatorio Analitico (CSV)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
