export interface Merchant {
  id: string
  name: string
  address: `0x${string}`
  category: "alimentacao" | "gas" | "ambos"
  verified: boolean
  distance?: string
  location?: string
}

const merchants: Merchant[] = [
  {
    id: "mercado-silva",
    name: "Supermercado do Silva",
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    category: "alimentacao",
    verified: true,
    distance: "A 450m de voce",
    location: "Rua das Flores, 123 - Centro",
  },
  {
    id: "padaria-sol",
    name: "Panificadora e Mercearia Sol",
    address: "0xE94E4f16ad40F8E1E1B6eB71eA9E3E9bA5B4dF2C",
    category: "alimentacao",
    verified: true,
    distance: "A 1.2 km de voce",
    location: "Av. Principal, 404 - Bairro Novo",
  },
  {
    id: "distribuidora-gas",
    name: "Distribuidora de Gas LP",
    address: "0xB2A4B4c2b0CBc6F1e1a5F2B8a7F6d4E3c2A1b9D8",
    category: "gas",
    verified: true,
    distance: "A 2.0 km de voce",
    location: "Av. Industrial, 500 - Zona Sul",
  },
  {
    id: "mercado-central",
    name: "Mercearia Central",
    address: "0x9F7B5e6a2D1c3b4A8f0E6d5C2b1A9f8E7d4C3b2",
    category: "alimentacao",
    verified: true,
    distance: "A 800m de voce",
    location: "Rua Augusta, 250 - Centro",
  },
]

export class MerchantRegistry {
  getByAddress(address: `0x${string}`): Merchant | undefined {
    return merchants.find(
      (m) => m.address.toLowerCase() === address.toLowerCase()
    )
  }

  getByCategory(category: "alimentacao" | "gas"): Merchant[] {
    return merchants.filter(
      (m) => m.category === category || m.category === "ambos"
    )
  }

  getAll(): Merchant[] {
    return [...merchants]
  }

  isVerified(address: `0x${string}`): boolean {
    const merchant = this.getByAddress(address)
    return merchant?.verified ?? false
  }

  getRandomMerchant(): Merchant {
    return merchants[Math.floor(Math.random() * merchants.length)]
  }
}

export const merchantRegistry = new MerchantRegistry()
