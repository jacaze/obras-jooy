import { useState, useRef, useEffect } from 'react'

export interface ItemOpcaoBusca {
  id: string
  codigo: string
  codigoSienge?: string | null
  descricao: string
  unidade?: string
  saldoDisponivel?: number
  limiteOrcamento?: number
  detalheExtra?: string
}

interface SeletorItemPesquisavelProps {
  itens: ItemOpcaoBusca[]
  valorSelecionadoId: string
  onSelecionar: (id: string) => void
  placeholder?: string
  obrigatorio?: boolean
  desabilitado?: boolean
  labelAria?: string
}

export function SeletorItemPesquisavel({
  itens,
  valorSelecionadoId,
  onSelecionar,
  placeholder = 'Buscar por codigo ou descricao...',
  obrigatorio = false,
  desabilitado = false,
  labelAria = 'Selecionar item',
}: SeletorItemPesquisavelProps) {
  const [aberto, setAberto] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const itemSelecionado = itens.find((it) => it.id === valorSelecionadoId)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const itensFiltrados = itens.filter((it) => {
    if (!termoBusca.trim()) return true
    const busca = termoBusca.toLowerCase()
    const cod = it.codigo.toLowerCase()
    const codSienge = it.codigoSienge ? it.codigoSienge.toLowerCase() : ''
    const desc = it.descricao.toLowerCase()
    return cod.includes(busca) || codSienge.includes(busca) || desc.includes(busca)
  })

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      {/* Visual quando um item ja esta selecionado */}
      {itemSelecionado && !aberto ? (
        <div
          onClick={() => {
            if (!desabilitado) {
              setAberto(true)
              setTermoBusca('')
            }
          }}
          className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-primary/30 bg-surface-container-low text-on-surface min-h-[48px] w-full transition-all ${
            desabilitado ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'
          }`}
        >
          <div className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0 flex-1 text-sm font-body">
            <strong className="ob-mono font-semibold text-accent-text mr-2">
              {itemSelecionado.codigo}
            </strong>
            <span className="text-on-surface">{itemSelecionado.descricao}</span>
            {itemSelecionado.unidade && (
              <span className="text-on-surface-variant ml-1.5 font-mono">
                ({itemSelecionado.unidade})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {itemSelecionado.saldoDisponivel !== undefined && (
              <span
                className={`ob-badge ${
                  itemSelecionado.saldoDisponivel > 0 ? 'ob-badge--ok' : 'ob-badge--crit'
                } ob-mono text-xs`}
              >
                [Disp: {itemSelecionado.saldoDisponivel}
                {itemSelecionado.limiteOrcamento !== undefined
                  ? ` | Limite: ${itemSelecionado.limiteOrcamento}`
                  : ''}
                ]
              </span>
            )}

            {!desabilitado && (
              <button
                type="button"
                aria-label="Limpar selecao"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelecionar('')
                  setTermoBusca('')
                  setAberto(true)
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-on-surface text-lg cursor-pointer transition-colors"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Campo de texto de busca quando aberto ou sem selecao */
        <div className="ob-search relative w-full">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            role="combobox"
            aria-label={labelAria}
            aria-expanded={aberto}
            disabled={desabilitado}
            required={obrigatorio && !valorSelecionadoId}
            placeholder={
              itemSelecionado
                ? `${itemSelecionado.codigo} - ${itemSelecionado.descricao}`
                : placeholder
            }
            value={termoBusca}
            onChange={(e) => {
              setTermoBusca(e.target.value)
              if (!aberto) setAberto(true)
            }}
            onFocus={() => setAberto(true)}
            className="ob-input"
          />

          {aberto && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50 divide-y divide-surface-container">
              {itensFiltrados.length === 0 ? (
                <div className="p-4 text-sm text-on-surface-variant text-center font-body">
                  Nenhum item encontrado para "{termoBusca}".
                </div>
              ) : (
                itensFiltrados.map((it) => {
                  const ehOSelecionado = it.id === valorSelecionadoId
                  return (
                    <div
                      key={it.id}
                      role="option"
                      aria-selected={ehOSelecionado}
                      onClick={() => {
                        onSelecionar(it.id)
                        setAberto(false)
                        setTermoBusca('')
                      }}
                      className={`min-h-[48px] px-4 py-2.5 flex justify-between items-center gap-2 cursor-pointer transition-colors text-sm font-body ${
                        ehOSelecionado
                          ? 'bg-primary/10'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="ob-mono font-semibold text-accent-text mr-2">
                          {it.codigo}
                        </strong>
                        {it.codigoSienge && (
                          <span className="ob-badge ob-badge--info font-mono text-[10px] py-0 px-1.5 mr-2">
                            {it.codigoSienge}
                          </span>
                        )}
                        <span className="text-on-surface">{it.descricao}</span>
                        {it.unidade && (
                          <span className="text-on-surface-variant ml-1.5 font-mono">
                            ({it.unidade})
                          </span>
                        )}
                        {it.detalheExtra && (
                          <div className="text-xs text-on-surface-variant mt-0.5">
                            {it.detalheExtra}
                          </div>
                        )}
                      </div>

                      {it.saldoDisponivel !== undefined && (
                        <div
                          className={`ob-badge ${
                            it.saldoDisponivel > 0 ? 'ob-badge--ok' : 'ob-badge--crit'
                          } ob-mono text-xs shrink-0`}
                        >
                          Disp: {it.saldoDisponivel}
                          {it.limiteOrcamento !== undefined ? ` | Limite: ${it.limiteOrcamento}` : ''}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
export default SeletorItemPesquisavel
