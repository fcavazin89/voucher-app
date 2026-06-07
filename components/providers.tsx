"use client"

import dynamic from "next/dynamic"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import web3AuthContextConfig from "@/lib/web3/web3auth-config"

const Web3AuthProvider = dynamic(
  () => import("@web3auth/modal/react").then((m) => m.Web3AuthProvider),
  { ssr: false },
)

const WagmiProvider = dynamic(
  () => import("@web3auth/modal/react/wagmi").then((m) => m.WagmiProvider),
  { ssr: false },
)

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-emerald-50" />
      </QueryClientProvider>
    )
  }

  // Sem Web3Auth configurado: mostra tela de aviso
  if (!web3AuthContextConfig) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-600 to-emerald-700 px-4">
          <div className="w-full max-w-sm text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <span className="text-4xl">⚙️</span>
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-white">
              Configuração Necessária
            </h1>
            <p className="mb-6 text-emerald-100">
              A variável <code className="rounded bg-white/10 px-2 py-1 font-mono text-sm">NEXT_PUBLIC_WEB3AUTH_CLIENT_ID</code> não foi configurada.
            </p>
            <p className="mb-8 text-sm text-emerald-200">
              Adicione esta variável no painel do Vercel (Project Settings &rarr; Environment Variables) com o Client ID do Web3Auth.
            </p>
            <a
              href="https://dashboard.web3auth.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50"
            >
              Configurar Web3Auth
            </a>
          </div>
        </div>
      </QueryClientProvider>
    )
  }

  // Com Web3Auth: QueryClient > Web3Auth > Wagmi
  return (
    <QueryClientProvider client={queryClient}>
      <Web3AuthProvider config={web3AuthContextConfig}>
        <WagmiProvider>
          {children}
        </WagmiProvider>
      </Web3AuthProvider>
    </QueryClientProvider>
  )
}
