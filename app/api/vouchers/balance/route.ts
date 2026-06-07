import { NextRequest, NextResponse } from "next/server"
import { smartContract } from "@/lib/web3/server/smart-contract"
import { VOUCHER_TOKEN_IDS, VoucherType } from "@/lib/web3/config"
import { formatUnits } from "viem"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")
  const voucherType = searchParams.get("type") as VoucherType | null

  if (!address) {
    return NextResponse.json({ error: "Endereco da carteira obrigatorio" }, { status: 400 })
  }

  try {
    const types: VoucherType[] = voucherType ? [voucherType] : ["alimentacao", "gas"]

    const balances = await Promise.all(
      types.map(async (type) => {
        const rawBalance = await smartContract.getBalance(address as `0x${string}`, type)
        const formatted = formatUnits(rawBalance, 2)
        return {
          type,
          rawBalance: rawBalance.toString(),
          formattedBalance: formatted,
          displayBalance: `R$ ${parseFloat(formatted).toFixed(2).replace(".", ",")}`,
          tokenId: VOUCHER_TOKEN_IDS[type].toString(),
        }
      })
    )

    return NextResponse.json({ balances, address })
  } catch (error: any) {
    console.error("[API] Erro ao buscar saldos:", error)
    return NextResponse.json(
      { error: error?.message || "Falha ao buscar saldos da blockchain" },
      { status: 500 }
    )
  }
}
