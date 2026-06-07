import type { Web3AuthContextConfig } from "@web3auth/modal/react"

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID

if (!clientId) {
  console.warn(
    "[Web3Auth] NEXT_PUBLIC_WEB3AUTH_CLIENT_ID not configured. Web3Auth will be disabled.",
  )
}

const web3AuthContextConfig: Web3AuthContextConfig | null = clientId
  ? {
      web3AuthOptions: {
        clientId,
        web3AuthNetwork: "sapphire_devnet",
      },
    }
  : null

export default web3AuthContextConfig
