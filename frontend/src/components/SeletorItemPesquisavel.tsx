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
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #0369a1',
            backgroundColor: '#f0f9ff',
            cursor: desabilitado ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 400,
            color: '#0f172a',
            minHeight: '44px',
            boxSizing: 'border-box',
            width: '100%',
            minWidth: 0,
          }}
        >
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}
          >
            <strong style={{ color: '#0369a1', fontWeight: 600, marginRight: '8px' }}>
              {itemSelecionado.codigo}
            </strong>
            <span>{itemSelecionado.descricao}</span>
            {itemSelecionado.unidade && (
              <span style={{ color: '#475569', marginLeft: '8px' }}>({itemSelecionado.unidade})</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {itemSelecionado.saldoDisponivel !== undefined && (
              <span
                style={{
                  fontSize: '0.875rem',
                  color: itemSelecionado.saldoDisponivel > 0 ? '#15803d' : '#b91c1c',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
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
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '8px',
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            )}
          </div>
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
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 400,
              color: '#0f172a',
              boxSizing: 'border-box',
              minHeight: '44px',
            }}
          />

          {aberto && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)',
                maxHeight: '240px',
                overflowY: 'auto',
                zIndex: 9999,
              }}
            >
              {itensFiltrados.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    color: '#475569',
                    textAlign: 'center',
                  }}
                >
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
                        minHeight: '44px',
                        padding: '8px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        backgroundColor: ehOSelecionado ? '#f0f9ff' : '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        if (!ehOSelecionado) e.currentTarget.style.backgroundColor = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        if (!ehOSelecionado) e.currentTarget.style.backgroundColor = '#ffffff'
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0369a1', fontWeight: 600, marginRight: '8px' }}>
                          {it.codigo}
                        </strong>
                        <span style={{ color: '#0f172a' }}>{it.descricao}</span>
                        {it.unidade && (
                          <span style={{ color: '#475569', marginLeft: '8px' }}>({it.unidade})</span>
                        )}
                        {it.detalheExtra && (
                          <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '8px' }}>
                            {it.detalheExtra}
                          </div>
                        )}
                      </div>

                      {it.saldoDisponivel !== undefined && (
                        <div
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: it.saldoDisponivel > 0 ? '#166534' : '#991b1b',
                            backgroundColor: it.saldoDisponivel > 0 ? '#dcfce7' : '#fee2e2',
                            padding: '8px',
                            borderRadius: '8px',
                            whiteSpace: 'nowrap',
                            marginLeft: '8px',
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
export default SeletorItemPesquisavel
