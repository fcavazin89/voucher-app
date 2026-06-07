/**
 * Cliente para a Valora API (valora-api — Express/Node)
 * Base: process.env.NEXT_PUBLIC_API_URL (ex: http://localhost:4000)
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}/api/v1${path}`
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

// ── Beneficiários ─────────────────────────────────────────────────────────────
export const beneficiarioApi = {
  getAll: (params?: string) => apiFetch<any>(`/beneficiarios${params ? `?${params}` : ""}`),
  getById: (id: number) => apiFetch<any>(`/beneficiarios/${id}`),
}

// ── Comércios ─────────────────────────────────────────────────────────────────
export const comercioApi = {
  getAll: (params?: string) => apiFetch<any>(`/comercios${params ? `?${params}` : ""}`),
  getById: (id: number) => apiFetch<any>(`/comercios/${id}`),
  verificarEndereco: async (address: string): Promise<boolean> => {
    try {
      const data = await apiFetch<any>(`/comercios?wallet_address=${address}`)
      return (data?.data?.length ?? 0) > 0
    } catch {
      return false
    }
  },
}

// ── Transações ────────────────────────────────────────────────────────────────
export const transacaoApi = {
  getAll: (params?: string) => apiFetch<any>(`/transacoes${params ? `?${params}` : ""}`),
  create: (body: {
    cartao_id: number
    comercio_id: number
    valor: number
    tipo: string
    tx_hash?: string
  }) =>
    apiFetch<any>("/transacoes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
}

// ── Cartões ───────────────────────────────────────────────────────────────────
export const cartaoApi = {
  getByBeneficiario: (beneficiarioId: number) =>
    apiFetch<any>(`/cartoes?beneficiario_id=${beneficiarioId}`),
  getById: (id: number) => apiFetch<any>(`/cartoes/${id}`),
}

// ── Programas ─────────────────────────────────────────────────────────────────
export const programaApi = {
  getAll: () => apiFetch<any>("/programas"),
  getById: (id: number) => apiFetch<any>(`/programas/${id}`),
}

// ── Saúde da API ──────────────────────────────────────────────────────────────
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}
