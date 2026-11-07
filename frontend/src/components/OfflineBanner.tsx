import { useOfflineSync } from '../hooks/useOfflineSync'

export function OfflineBanner() {
  const { isOnline, pendentes, isSincronizando, sincronizar } = useOfflineSync()

  if (isOnline && pendentes.length === 0) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-2.5 px-4 sm:px-6 transition-all duration-300 border-b text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between gap-3 ${
        !isOnline
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
          : 'bg-info/15 border-info/30 text-info dark:text-sky-300'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="material-symbols-outlined text-base sm:text-lg shrink-0">
          {!isOnline ? 'wifi_off' : 'cloud_sync'}
        </span>
        <span>
          {!isOnline ? (
            <>
              <strong className="font-semibold">Modo Offline (Canteiro sem internet):</strong> Seus pedidos
              serão salvos localmente e sincronizados de forma automática assim que a conexão retornar.
              {pendentes.length > 0 && (
                <span className="ml-1.5 font-bold">
                  ({pendentes.length} {pendentes.length === 1 ? 'pedido pendente' : 'pedidos pendentes'})
                </span>
              )}
            </>
          ) : (
            <>
              <strong className="font-semibold">Conexão Restabelecida:</strong> Existem{' '}
              <strong className="font-bold">{pendentes.length}</strong>{' '}
              {pendentes.length === 1 ? 'pedido salvo offline pronto' : 'pedidos salvos offline prontos'}{' '}
              para envio ao servidor.
            </>
          )}
        </span>
      </div>

      {isOnline && pendentes.length > 0 && (
        <button
          type="button"
          onClick={() => sincronizar()}
          disabled={isSincronizando}
          className="ob-btn ob-btn--primary py-1 px-3 text-xs flex items-center gap-1.5 shrink-0 ml-auto disabled:opacity-50"
        >
          <span
            className={`material-symbols-outlined text-sm ${
              isSincronizando ? 'animate-spin' : ''
            }`}
          >
            sync
          </span>
          {isSincronizando ? 'Sincronizando...' : 'Sincronizar Agora'}
        </button>
      )}
    </div>
  )
}
