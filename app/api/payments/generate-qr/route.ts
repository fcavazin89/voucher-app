import { NextRequest, NextResponse } from "next/server"
import { VOUCHER_TOKEN_IDS, VoucherType } from "@/lib/web3/config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { voucherType, amount, fromAddress } = body

    if (!voucherType || !amount || !fromAddress) {
      return NextResponse.json(
        { error: "voucherType, amount e fromAddress sao obrigatorios" },
        { status: 400 }
      )
    }

    if (!["alimentacao", "gas"].includes(voucherType)) {
      return NextResponse.json(
        { error: "Tipo de voucher invalido. Use: alimentacao ou gas" },
        { status: 400 }
      )
    }

    const transactionId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const expiresAt = Date.now() + 60000

    const qrPayload = {
      version: 1,
      type: "voucher_payment",
      voucherType,
      amount: amount.toString(),
      fromAddress,
      tokenId: VOUCHER_TOKEN_IDS[voucherType as VoucherType].toString(),
      transactionId,
      expiresAt,
      network: process.env.NEXT_PUBLIC_CHAIN_ID === "80002" ? "polygon-amoy" : "polygon",
    }

    const qrData = JSON.stringify(qrPayload)

    return NextResponse.json({
      qrData,
      expiresAt,
      transactionId,
      qrPayload,
    })
  } catch (error: any) {
    console.error("[API] Erro ao gerar QR:", error)
    return NextResponse.json(
      { error: error?.message || "Falha ao gerar QR Code" },
      { status: 500 }
    )
  }
}
