"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react"
import { useAccount } from "wagmi"
import { voucherService, VoucherBalance, VoucherType } from "@/lib/web3"

interface UseWalletReturn {
  isInitialized: boolean
  isLoading: boolean
  address: string | null
  shortAddress: string
  initialize: () => Promise<void>
  clear: () => Promise<void>
}

/**
 * Hook para gerenciar a carteira embutida via MetaMask Embedded Wallets (Web3Auth).
 * O usuário faz login com Google, email ou carteira externa — sem ver chaves privadas.
 */
export function useWallet(): UseWalletReturn {
  const { connect, isConnected, loading } = useWeb3AuthConnect()
  const { disconnect } = useWeb3AuthDisconnect()
  const { address } = useAccount()

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Não conectado"

  const initialize = useCallback(async () => {
    await connect()
  }, [connect])

  const clear = useCallback(async () => {
    await disconnect()
  }, [disconnect])

  return {
    isInitialized: isConnected,
    isLoading: loading,
    address: address ?? null,
    shortAddress,
    initialize,
    clear,
  }
}

interface UseVoucherBalanceReturn {
  balances: VoucherBalance[]
  totalBalance: string
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook para buscar saldos de vouchers
 * Atualiza automaticamente e fornece total formatado
 */
export function useVoucherBalance(): UseVoucherBalanceReturn {
  const [balances, setBalances] = useState<VoucherBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const allBalances = await voucherService.getAllBalances()
      setBalances(allBalances)
    } catch (err) {
      setError("Erro ao carregar saldos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  const totalBalance = balances.reduce((sum, b) => {
    return sum + parseFloat(b.formattedBalance)
  }, 0)

  return {
    balances,
    totalBalance: `R$ ${totalBalance.toFixed(2).replace(".", ",")}`,
    isLoading,
    error,
    refetch: fetchBalances,
  }
}

interface UsePaymentQRReturn {
  qrData: string | null
  transactionId: string | null
  expiresIn: number
  isGenerating: boolean
  generate: (voucherType: VoucherType, amount: string) => Promise<void>
  reset: () => void
}

/**
 * Hook para gerar QR Code de pagamento
 * Gerencia expiração e regeneração automática
 */
export function usePaymentQR(): UsePaymentQRReturn {
  const [qrData, setQrData] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState(60)
  const [isGenerating, setIsGenerating] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (expiresIn <= 0 || !qrData) return
    
    const timer = setInterval(() => {
      setExpiresIn((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [qrData, expiresIn])

  const generate = useCallback(async (voucherType: VoucherType, amount: string) => {
    setIsGenerating(true)
    try {
      const result = await voucherService.generatePaymentQR(voucherType, amount)
      setQrData(result.qrData)
      setTransactionId(result.transactionId)
      setExpiresIn(60)
    } catch (error) {
      console.error("[v0] Erro ao gerar QR:", error)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setQrData(null)
    setTransactionId(null)
    setExpiresIn(60)
  }, [])

  return {
    qrData,
    transactionId,
    expiresIn,
    isGenerating,
    generate,
    reset,
  }
}

export type ScannerStatus = "idle" | "scanning" | "review" | "processing" | "success"

export interface ScannedPayment {
  merchantName: string
  merchantAddress: `0x${string}`
  amount: string
  voucherType: VoucherType
  verified: boolean
}

interface UseQRScannerReturn {
  status: ScannerStatus
  scanned: ScannedPayment | null
  transactionHash: string | null
  startScan: () => void
  handleQRResult: (rawQR: string) => Promise<void>
  confirmPayment: () => Promise<void>
  reset: () => void
}

/**
 * Hook para escanear o QR Code exibido pelo comerciante via câmera real.
 * Fluxo: câmera ativa → lê QR → revisa valor → confirma → sucesso.
 */
export function useQRScanner(): UseQRScannerReturn {
  const [status, setStatus] = useState<ScannerStatus>("idle")
  const [scanned, setScanned] = useState<ScannedPayment | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  // Ativa a câmera
  const startScan = useCallback(() => {
    setStatus("scanning")
    setScanned(null)
    setTransactionHash(null)
  }, [])

  // Recebe o texto lido pelo QrCameraScanner e processa
  const handleQRResult = useCallback(async (rawQR: string) => {
    try {
      // Tenta parsear o payload JSON do QR do comerciante
      const payload = JSON.parse(rawQR)

      if (payload?.type === "VOUCHER_CHARGE" || payload?.chargeId) {
        // QR gerado pelo COMERCIANTE - VS
        const result: ScannedPayment = {
          merchantName: payload.merchantName ?? "Comerciante",
          merchantAddress: (payload.merchantAddress ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
          amount: payload.amount
            ? `R$ ${Number(payload.amount).toFixed(2).replace(".", ",")}`
            : "R$ 0,00",
          voucherType: "alimentacao",
          verified: true,
        }

        // Notifica a API do comerciante que o QR foi lido
        try {
          await voucherService.notifyQRScanned(payload.chargeId, payload.apiUrl)
        } catch {
          // silent — não bloqueia o fluxo
        }

        setScanned(result)
        setStatus("review")
        return
      }

      // QR genérico — passa para a API de scan
      const data = await voucherService.parseMerchantQR(rawQR)
      setScanned(data)
      setStatus("review")
    } catch {
      // QR não reconhecido — tenta via API
      try {
        const data = await voucherService.parseMerchantQR(rawQR)
        setScanned(data)
        setStatus("review")
      } catch (error) {
        console.error("[useQRScanner] QR inválido:", error)
        setStatus("idle")
      }
    }
  }, [])

  const confirmPayment = useCallback(async () => {
    if (!scanned) return
    setStatus("processing")
    try {
      const amountValue = scanned.amount.replace(/[^\d,]/g, "").replace(",", ".")
      const result = await voucherService.processPayment(
        scanned.voucherType,
        amountValue,
        scanned.merchantAddress
      )
      if (result.success) {
        setTransactionHash(result.transactionHash ?? null)
        setStatus("success")
      } else {
        setStatus("review")
      }
    } catch (error) {
      console.error("[v0] Erro ao confirmar pagamento:", error)
      setStatus("review")
    }
  }, [scanned])

  const reset = useCallback(() => {
    setStatus("idle")
    setScanned(null)
    setTransactionHash(null)
  }, [])

  return {
    status,
    scanned,
    transactionHash,
    startScan,
    handleQRResult,
    confirmPayment,
    reset,
  }
}
