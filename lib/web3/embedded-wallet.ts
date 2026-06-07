import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"

const WALLET_STORAGE_KEY = "voucher_social_wallet"

interface StoredWallet {
  privateKey: `0x${string}`
  address: `0x${string}`
  createdAt: number
}

/**
 * Serviço de carteira embutida - cria automaticamente uma carteira para o usuário
 * sem que ele precise entender nada de Web3, chaves privadas ou seed phrases.
 * A carteira é armazenada localmente e vinculada ao login do usuário.
 */
export class EmbeddedWalletService {
  private wallet: StoredWallet | null = null

  /**
   * Inicializa ou recupera a carteira do usuário
   * Chamado automaticamente no login
   */
  async initialize(userId: string): Promise<`0x${string}`> {
    const storageKey = `${WALLET_STORAGE_KEY}_${userId}`
    
    // Tenta recuperar carteira existente
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        this.wallet = JSON.parse(stored) as StoredWallet
        return this.wallet.address
      }
    }

    // Cria nova carteira automaticamente
    const privateKey = generatePrivateKey()
    const account = privateKeyToAccount(privateKey)
    
    this.wallet = {
      privateKey,
      address: account.address,
      createdAt: Date.now(),
    }

    // Persiste localmente (em produção, usar solução mais segura)
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(this.wallet))
    }

    return this.wallet.address
  }

  /**
   * Retorna o endereço da carteira (formato curto para exibição)
   */
  getShortAddress(): string {
    if (!this.wallet) return "Não conectado"
    const addr = this.wallet.address
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  /**
   * Retorna o endereço completo
   */
  getAddress(): `0x${string}` | null {
    return this.wallet?.address ?? null
  }

  /**
   * Retorna a conta para assinar transações
   */
  getAccount() {
    if (!this.wallet) return null
    return privateKeyToAccount(this.wallet.privateKey)
  }

  /**
   * Verifica se a carteira está inicializada
   */
  isInitialized(): boolean {
    return this.wallet !== null
  }

  /**
   * Limpa a carteira (logout)
   */
  clear(userId: string): void {
    const storageKey = `${WALLET_STORAGE_KEY}_${userId}`
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey)
    }
    this.wallet = null
  }
}

// Singleton para uso em toda a aplicação
export const embeddedWallet = new EmbeddedWalletService()
