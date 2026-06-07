import { createPublicClient, createWalletClient, http, defineChain, parseUnits, formatUnits } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygon, polygonAmoy } from "viem/chains"
import { VOUCHER_CONTRACT_ADDRESS, VOUCHER_ABI, VOUCHER_TOKEN_IDS, VoucherType } from "../config"

function getChain() {
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID
  if (chainId === "80002") return polygonAmoy
  return polygon
}

function getRpcUrl() {
  return process.env.RPC_URL || "https://polygon-rpc.com"
}

const chain = getChain()

const publicClient = createPublicClient({
  chain,
  transport: http(getRpcUrl()),
})

function getWalletClient() {
  const privateKey = process.env.CONTRACT_ADMIN_PRIVATE_KEY as `0x${string}`
  if (!privateKey) {
    throw new Error("CONTRACT_ADMIN_PRIVATE_KEY nao configurada no ambiente")
  }
  const account = privateKeyToAccount(privateKey)
  return createWalletClient({
    account,
    chain,
    transport: http(getRpcUrl()),
  })
}

export class SmartContractService {
  async getBalance(accountAddress: `0x${string}`, voucherType: VoucherType): Promise<bigint> {
    try {
      const tokenId = VOUCHER_TOKEN_IDS[voucherType]
      const balance = await publicClient.readContract({
        address: VOUCHER_CONTRACT_ADDRESS,
        abi: VOUCHER_ABI,
        functionName: "balanceOf",
        args: [accountAddress, tokenId],
      })
      return balance as bigint
    } catch (error) {
      console.error("[SmartContract] Erro ao buscar saldo:", error)
      return 0n
    }
  }

  async isMerchantRegistered(merchantAddress: `0x${string}`): Promise<boolean> {
    try {
      const balance = await publicClient.readContract({
        address: VOUCHER_CONTRACT_ADDRESS,
        abi: VOUCHER_ABI,
        functionName: "balanceOf",
        args: [merchantAddress, 0n],
      })
      return (balance as bigint) > 0n
    } catch {
      return false
    }
  }

  async transferVoucher(
    fromAddress: `0x${string}`,
    toAddress: `0x${string}`,
    voucherType: VoucherType,
    amount: string
  ): Promise<{ success: boolean; transactionHash?: `0x${string}`; error?: string }> {
    try {
      const walletClient = getWalletClient()
      const tokenId = VOUCHER_TOKEN_IDS[voucherType]
      const parsedAmount = parseUnits(amount.replace(",", "."), 2)

      const hash = await walletClient.writeContract({
        address: VOUCHER_CONTRACT_ADDRESS,
        abi: VOUCHER_ABI,
        functionName: "safeTransferFrom",
        args: [fromAddress, toAddress, tokenId, parsedAmount, "0x"],
        account: walletClient.account,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === "success") {
        return { success: true, transactionHash: hash }
      }
      return { success: false, error: "Transacao revertida pelo contrato" }
    } catch (error: any) {
      console.error("[SmartContract] Erro ao transferir voucher:", error)
      return {
        success: false,
        error: error?.shortMessage || error?.message || "Erro desconhecido ao processar pagamento",
      }
    }
  }

  async getTokenURI(voucherType: VoucherType): Promise<string> {
    try {
      const tokenId = VOUCHER_TOKEN_IDS[voucherType]
      const uri = await publicClient.readContract({
        address: VOUCHER_CONTRACT_ADDRESS,
        abi: VOUCHER_ABI,
        functionName: "uri",
        args: [tokenId],
      })
      return uri as string
    } catch {
      return ""
    }
  }
}

export const smartContract = new SmartContractService()
