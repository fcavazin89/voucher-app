import { NextRequest, NextResponse } from "next/server"
import { merchantRegistry } from "@/lib/web3/server/merchant-registry"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  try {
    let merchants
    if (category && (category === "alimentacao" || category === "gas")) {
      merchants = merchantRegistry.getByCategory(category)
    } else {
      merchants = merchantRegistry.getAll()
    }

    return NextResponse.json({ merchants })
  } catch (error: any) {
    console.error("[API] Erro ao listar comerciantes:", error)
    return NextResponse.json(
      { error: error?.message || "Falha ao listar comerciantes" },
      { status: 500 }
    )
  }
}
