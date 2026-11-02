import { useState, useRef, useEffect } from 'react'

export interface ItemOpcaoBusca {
  id: string
  codigo: string
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
    const desc = it.descricao.toLowerCase()
    return cod.includes(busca) || desc.includes(busca)
  })

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Visual quando um item ja esta selecionado */}
      {itemSelecionado && !aberto ? (
        <div
          onClick={() => {
            if (!desabilitado) {
              setAberto(true)
              setTermoBusca('')
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 0.65rem',
            borderRadius: '4px',
            border: '1px solid #0284c7',
            backgroundColor: '#f0f9ff',
            cursor: desabilitado ? 'not-allowed' : 'pointer',
            fontSize: '0.82rem',
            color: '#0f172a',
            minHeight: '36px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
            <strong style={{ color: '#0369a1', marginRight: '0.35rem' }}>{itemSelecionado.codigo}</strong>
            <span>{itemSelecionado.descricao}</span>
            {itemSelecionado.unidade && (
              <span style={{ color: '#64748b', marginLeft: '0.3rem' }}>({itemSelecionado.unidade})</span>
            )}
            {itemSelecionado.saldoDisponivel !== undefined && (
              <span
                style={{
                  marginLeft: '0.4rem',
                  fontSize: '0.75rem',
                  color: itemSelecionado.saldoDisponivel > 0 ? '#15803d' : '#b91c1c',
                  fontWeight: 600,
                }}
              >
                [Disp: {itemSelecionado.saldoDisponivel}
                {itemSelecionado.limiteOrcamento !== undefined
                  ? ` | Limite: ${itemSelecionado.limiteOrcamento}`
                  : ''}
                ]
              </span>
            )}
          </div>

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
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0 0.2rem',
                fontWeight: 700,
              }}
            >
              &times;
            </button>
          )}
        </div>
      ) : (
        /* Campo de texto de busca quando aberto ou sem selecao */
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            role="combobox"
            aria-label={labelAria}
            aria-expanded={aberto}
            disabled={desabilitado}
            required={obrigatorio && !valorSelecionadoId}
            placeholder={itemSelecionado ? `${itemSelecionado.codigo} - ${itemSelecionado.descricao}` : placeholder}
            value={termoBusca}
            onChange={(e) => {
              setTermoBusca(e.target.value)
              if (!aberto) setAberto(true)
            }}
            onFocus={() => setAberto(true)}
            style={{
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.82rem',
              color: '#0f172a',
              boxSizing: 'border-box',
              minHeight: '36px',
            }}
          />

          {aberto && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.2rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                maxHeight: '220px',
                overflowY: 'auto',
                zIndex: 9999,
              }}
            >
              {itensFiltrados.length === 0 ? (
                <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
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
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        backgroundColor: ehOSelecionado ? '#f0f9ff' : '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (!ehOSelecionado) e.currentTarget.style.backgroundColor = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        if (!ehOSelecionado) e.currentTarget.style.backgroundColor = '#ffffff'
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0369a1', marginRight: '0.35rem' }}>{it.codigo}</strong>
                        <span style={{ color: '#0f172a' }}>{it.descricao}</span>
                        {it.unidade && <span style={{ color: '#64748b', marginLeft: '0.3rem' }}>({it.unidade})</span>}
                        {it.detalheExtra && (
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                            {it.detalheExtra}
                          </div>
                        )}
                      </div>

                      {it.saldoDisponivel !== undefined && (
                        <div
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            color: it.saldoDisponivel > 0 ? '#15803d' : '#b91c1c',
                            backgroundColor: it.saldoDisponivel > 0 ? '#dcfce7' : '#fee2e2',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            marginLeft: '0.5rem',
                          }}
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
