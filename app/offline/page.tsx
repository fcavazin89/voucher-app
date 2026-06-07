"use client"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-6">
        <svg
          className="w-10 h-10 text-orange-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M8.111 8.111A5.97 5.97 0 006 12c0 3.314 2.686 6 6 6a5.97 5.97 0 003.889-1.111M10.584 10.586A2 2 0 0112 10c1.105 0 2 .895 2 2a2 2 0 01-.586 1.414M1.42 1.42A19.9 19.9 0 000 12c0 5.523 2.239 10.523 5.858 14.142M22.58 22.58A19.9 19.9 0 0024 12c0-5.523-2.239-10.523-5.858-14.142"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sem conexão</h1>
      <p className="text-gray-600 mb-2 max-w-sm">
        Você está offline. Verifique sua conexão e tente novamente.
      </p>
      <p className="text-sm text-gray-400 mb-8 max-w-sm">
        Seus vouchers ficam salvos localmente — você pode visualizá-los sem internet.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-semibold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
      >
        Tentar novamente
      </button>
    </div>
  )
}
