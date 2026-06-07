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

  // Sem Web3Auth configurado ou antes de montar: só QueryClient
  if (!mounted || !web3AuthContextConfig) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
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
