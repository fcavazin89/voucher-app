import { NextResponse } from "next/server"
import { merchantRegistry } from "@/lib/web3/server/merchant-registry"
import { comercioApi } from "@/lib/valora-api"

export async function POST(request: Request) {
  try {
    // Recebe endereço do comerciante escaneado no QR (opcional no modo demo)
    const body = await request.json().catch(() => ({}))
    const { merchantAddress } = body

    // Se vier endereço do QR, verifica na valora-api se é credenciado
    if (merchantAddress) {
      try {
        const data = await comercioApi.getAll(`wallet_address=${merchantAddress}`)
        const comercio = data?.data?.[0] ?? data?.[0] ?? null
        if (comercio) {
          return NextResponse.json({
            merchantName: comercio.nome_fantasia || comercio.razao_social,
            merchantAddress: comercio.wallet_address || merchantAddress,
            amount: body.amount || "R$ 0,00",
            voucherType: body.voucherType || "alimentacao",
            verified: true,
            source: "valora-api",
          })
        }
      } catch {
        // valora-api indisponível, continua com fallback
      }
    }

    // Fallback: modo demo com comerciantes do registry local
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const merchant = merchantRegistry.getRandomMerchant()

    const amountOptions = [
      { amount: "45,50", voucherType: "alimentacao" as const },
      { amount: "18,00", voucherType: "alimentacao" as const },
      { amount: "100,00", voucherType: "gas" as const },
      { amount: "32,00", voucherType: "alimentacao" as const },
      { amount: "87,00", voucherType: "alimentacao" as const },
    ]

    const picked = amountOptions[Math.floor(Math.random() * amountOptions.length)]

    return NextResponse.json({
      merchantName: merchant.name,
      merchantAddress: merchant.address,
      merchantLocation: merchant.location,
      amount: `R$ ${picked.amount}`,
      amountValue: picked.amount,
      voucherType: picked.voucherType,
      verified: merchant.verified,
      source: "demo",
    })
  } catch (error: any) {
    console.error("[API] Erro ao escanear QR:", error)
    return NextResponse.json(
      { error: error?.message || "Falha ao escanear QR Code" },
      { status: 500 }
    )
  }
}
