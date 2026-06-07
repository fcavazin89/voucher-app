import { NextRequest, NextResponse } from "next/server"
import { smartContract } from "@/lib/web3/server/smart-contract"
import { VoucherType } from "@/lib/web3/config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromAddress, toAddress, voucherType, amount } = body

    if (!fromAddress || !toAddress || !voucherType || !amount) {
      return NextResponse.json(
        { error: "fromAddress, toAddress, voucherType e amount sao obrigatorios" },
        { status: 400 }
      )
    }

    if (!["alimentacao", "gas"].includes(voucherType)) {
      return NextResponse.json(
        { error: "Tipo de voucher invalido. Use: alimentacao ou gas" },
        { status: 400 }
      )
    }

    if (isNaN(parseFloat(amount.replace(",", ".")))) {
      return NextResponse.json(
        { error: "Valor do pagamento invalido" },
        { status: 400 }
      )
    }

    const result = await smartContract.transferVoucher(
      fromAddress as `0x${string}`,
      toAddress as `0x${string}`,
      voucherType as VoucherType,
      amount
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash,
        message: "Pagamento processado com sucesso na blockchain",
      })
    }

    return NextResponse.json(
      { success: false, error: result.error || "Falha ao processar pagamento" },
      { status: 500 }
    )
  } catch (error: any) {
    console.error("[API] Erro ao processar pagamento:", error)
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar pagamento" },
      { status: 500 }
    )
  }
}
