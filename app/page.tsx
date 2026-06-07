"use client"

import dynamic from "next/dynamic"

const SocialVoucherWallet = dynamic(
  () => import("@/components/social-voucher-wallet").then((m) => m.SocialVoucherWallet),
  { ssr: false },
)

export default function Page() {
  return <SocialVoucherWallet />
}
