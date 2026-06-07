import { NextRequest, NextResponse } from "next/server"
import { merchantRegistry } from "@/lib/web3/server/merchant-registry"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json(
      { error: "Endereco do comerciante obrigatorio" },
      { status: 400 }
    )
  }

  try {
    const merchant = merchantRegistry.getByAddress(address as `0x${string}`)

    return NextResponse.json({
      address,
      verified: merchant?.verified ?? false,
      name: merchant?.name ?? null,
      category: merchant?.category ?? null,
    })
  } catch (error: any) {
    console.error("[API] Erro ao verificar comerciante:", error)
    return NextResponse.json(
      { error: error?.message || "Falha ao verificar comerciante" },
      { status: 500 }
    )
  }
}
