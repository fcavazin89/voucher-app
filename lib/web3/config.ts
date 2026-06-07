import { createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"

// Rede unificada: Ethereum Sepolia (igual ao COMERCIANTE)
export const NETWORK = sepolia

export const VOUCHER_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_VOUCHER_CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`

export const publicClient = createPublicClient({
  chain: NETWORK,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
})

// ABI simplificada do contrato ERC-1155 de Vouchers
export const VOUCHER_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "uri",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "safeTransferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const

// IDs dos tokens de voucher no contrato ERC-1155
export const VOUCHER_TOKEN_IDS = {
  alimentacao: 1n,
  gas: 2n,
} as const

export type VoucherType = keyof typeof VOUCHER_TOKEN_IDS
