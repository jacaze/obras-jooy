import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../api/client'

export function HomePage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>Obras Jooy - Almoxarifado</h1>
        <p style={{ color: '#64748b', margin: '0.5rem 0 0' }}>Sistema de Gestao e Estoque para Canteiros de Obras</p>
      </header>

      <section style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#334155', marginTop: 0 }}>Status de Integracao com a API</h2>

        {isLoading && <p style={{ color: '#0284c7' }}>Verificando comunicacao com o servidor...</p>}

        {isError && (
          <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '0.75rem', borderRadius: '4px', border: '1px solid #fecaca' }}>
            <strong>Falha na conexao com a API:</strong> {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
        )}

        {data && (
          <div style={{ color: '#15803d', background: '#f0fdf4', padding: '1rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
            <p style={{ margin: '0 0 0.5rem' }}><strong>Status do Back-end:</strong> {data.status}</p>
            <p style={{ margin: '0 0 0.5rem' }}><strong>Servico:</strong> {data.servico}</p>
            <p style={{ margin: '0 0 0.5rem' }}><strong>Versao:</strong> {data.versao}</p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }}><strong>Sincronizado em:</strong> {new Date(data.timestamp).toLocaleString('pt-BR')}</p>
          </div>
        )}
      </section>
    </div>
  )
}
