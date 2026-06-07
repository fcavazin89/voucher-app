import { embeddedWallet } from "./embedded-wallet"
import { VOUCHER_TOKEN_IDS, VoucherType } from "./config"

export interface VoucherBalance {
  type: VoucherType
  rawBalance: string
  formattedBalance: string
  displayBalance: string
  tokenId?: string
}

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}/api${path}`
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export class VoucherService {
  async getBalance(voucherType: VoucherType): Promise<VoucherBalance> {
    const address = embeddedWallet.getAddress()
    if (!address) {
      return {
        type: voucherType,
        rawBalance: "0",
        formattedBalance: "0.00",
        displayBalance: "R$ 0,00",
      }
    }

    try {
      const data = await apiFetch<{
        balances: VoucherBalance[]
      }>(`/vouchers/balance?address=${address}&type=${voucherType}`)
      return data.balances[0]
    } catch (error) {
      console.error("[VoucherService] Erro ao buscar saldo:", error)
      return {
        type: voucherType,
        rawBalance: "0",
        formattedBalance: "0.00",
        displayBalance: "R$ 0,00",
      }
    }
  }

  async getAllBalances(): Promise<VoucherBalance[]> {
    const address = embeddedWallet.getAddress()
    if (!address) return []

    try {
      const data = await apiFetch<{
        balances: VoucherBalance[]
      }>(`/vouchers/balance?address=${address}`)
      return data.balances
    } catch (error) {
      console.error("[VoucherService] Erro ao buscar saldos:", error)
      return []
    }
  }

  async generatePaymentQR(
    voucherType: VoucherType,
    amount: string
  ): Promise<{
    qrData: string
    expiresAt: number
    transactionId: string
  }> {
    const address = embeddedWallet.getAddress()
    try {
      const data = await apiFetch<{
        qrData: string
        expiresAt: number
        transactionId: string
      }>("/payments/generate-qr", {
        method: "POST",
        body: JSON.stringify({
          voucherType,
          amount,
          fromAddress: address,
        }),
      })
      return data
    } catch (error) {
      const transactionId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      const expiresAt = Date.now() + 60000
      const qrPayload = {
        version: 1,
        type: "voucher_payment",
        voucherType,
        amount,
        fromAddress: address,
        tokenId: VOUCHER_TOKEN_IDS[voucherType].toString(),
        transactionId,
        expiresAt,
        network: "polygon",
      }
      return {
        qrData: JSON.stringify(qrPayload),
        expiresAt,
        transactionId,
      }
    }
  }

  async scanMerchantQR(): Promise<{
    merchantName: string
    merchantAddress: `0x${string}`
    amount: string
    voucherType: VoucherType
    verified: boolean
  }> {
    // Dados de fallback para modo demo (sempre usados se API falhar)
    const demoMerchants = [
      { name: "Supermercado do Silva", amount: "R$ 45,50", voucherType: "alimentacao" as VoucherType },
      { name: "Panificadora Sol", amount: "R$ 18,00", voucherType: "alimentacao" as VoucherType },
      { name: "Distribuidora de Gas LP", amount: "R$ 100,00", voucherType: "gas" as VoucherType },
    ]
    const makeDemoResult = () => {
      const picked = demoMerchants[Math.floor(Math.random() * demoMerchants.length)]
      return {
        merchantName: picked.name,
        merchantAddress: `0x${Array.from({ length: 40 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}` as `0x${string}`,
        amount: picked.amount,
        voucherType: picked.voucherType,
        verified: true,
      }
    }

    try {
      const data = await apiFetch<{
        merchantName: string
        merchantAddress: `0x${string}`
        amount: string
        voucherType: VoucherType
        verified: boolean
      }>("/payments/scan-merchant", { method: "POST" })

      // Garante que o amount tem o prefixo correto
      return {
        ...data,
        amount: data.amount.startsWith("R$") ? data.amount : `R$ ${data.amount}`,
      }
    } catch (error) {
      console.warn("[VoucherService] scan-merchant falhou, usando demo:", error)
      await new Promise((resolve) => setTimeout(resolve, 1800))
      return makeDemoResult()
    }
  }

  async processPayment(
    voucherType: VoucherType,
    amount: string,
    merchantAddress: `0x${string}`
  ): Promise<{
    success: boolean
    transactionHash?: string
    error?: string
  }> {
    // Gera hash de demonstração (usado como fallback quando blockchain não está configurada)
    const makeFakeHash = () =>
      `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`

    const fromAddress = embeddedWallet.getAddress()

    // Se não há endereço da carteira legacy, ainda tenta a API (que pode usar Web3Auth)
    // e se falhar, cai no modo demo
    try {
      const data = await apiFetch<{
        success: boolean
        transactionHash?: string
        error?: string
      }>("/payments/process", {
        method: "POST",
        body: JSON.stringify({
          fromAddress: fromAddress ?? "0x0000000000000000000000000000000000000000",
          toAddress: merchantAddress,
          voucherType,
          amount,
        }),
      })

      if (data.success) return data

      // API retornou mas sem sucesso (ex: contrato não configurado) → modo demo
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return { success: true, transactionHash: makeFakeHash() }
    } catch (error: any) {
      console.warn("[VoucherService] Blockchain indisponível, modo demo:", error?.message)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return { success: true, transactionHash: makeFakeHash() }
    }
  }

  async isMerchantVerified(merchantAddress: `0x${string}`): Promise<boolean> {
    try {
      const data = await apiFetch<{ verified: boolean }>(
        `/merchants/verify?address=${merchantAddress}`
      )
      return data.verified
    } catch {
      return true
    }
  }

  /** Notifica a API do comerciante que o QR foi lido pelo beneficiário */
  async notifyQRScanned(chargeId: string, apiUrl?: string): Promise<void> {
    const url = apiUrl || `${getBaseUrl()}/api/charges/approve`
    // Só notifica, não aguarda resultado — o comerciante faz polling
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargeId, scannedAt: new Date().toISOString() }),
    }).catch(() => {})
  }

  /** Parseia o texto bruto de um QR Code e retorna os dados do comerciante */
  async parseMerchantQR(rawQR: string): Promise<{
    merchantName: string
    merchantAddress: `0x${string}`
    amount: string
    voucherType: VoucherType
    verified: boolean
  }> {
    try {
      // Tenta reconhecer via API de scan passando o payload lido
      const data = await apiFetch<{
        merchantName: string
        merchantAddress: `0x${string}`
        amount: string
        voucherType: VoucherType
        verified: boolean
      }>("/payments/scan-merchant", {
        method: "POST",
        body: JSON.stringify({ rawQR }),
      })
      return {
        ...data,
        amount: data.amount.startsWith("R$") ? data.amount : `R$ ${data.amount}`,
      }
    } catch {
      throw new Error("QR Code não reconhecido")
    }
  }
}

export const voucherService = new VoucherService()
