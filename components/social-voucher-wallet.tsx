"use client"

import { useState, useEffect } from "react"
import {
  Home,
  CreditCard,
  QrCode,
  ChevronLeft,
  MapPin,
  Shield,
  BadgeCheck,
  Wallet,
  Store,
  Flame,
  ShoppingBasket,
  ScanLine,
  CheckCircle2,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useWallet, useVoucherBalance, useQRScanner } from "@/hooks/use-web3"
import { useWeb3AuthConnect } from "@web3auth/modal/react"
import dynamic from "next/dynamic"

// Carrega o scanner de câmera apenas no browser (usa APIs de câmera)
const QrCameraScanner = dynamic(
  () => import("@/components/qr-camera-scanner").then((m) => m.QrCameraScanner),
  { ssr: false }
)

type View = "login" | "home" | "detail" | "payment"
type VoucherId = "alimentacao" | "gas"

interface Voucher {
  id: VoucherId
  benefitName: string
  nftSerial: string
  balance: string
  originalGrant: string
  gradient: string
  category: string
  expiration: string
  icon: React.ReactNode
}

const vouchers: Record<VoucherId, Voucher> = {
  alimentacao: {
    id: "alimentacao",
    benefitName: "Auxílio Alimentação Comunitária",
    nftSerial: "NFT #00241",
    balance: "R$ 250,00",
    originalGrant: "R$ 300,00",
    gradient: "bg-gradient-to-br from-orange-600 to-orange-400",
    category: "Mercados e Padarias",
    expiration: "31/12/2026",
    icon: <ShoppingBasket className="h-8 w-8 text-white/80" />,
  },
  gas: {
    id: "gas",
    benefitName: "Programa Gás Social",
    nftSerial: "NFT #10842",
    balance: "R$ 100,00",
    originalGrant: "R$ 100,00",
    gradient: "bg-gradient-to-br from-amber-600 to-amber-400",
    category: "Revendedores de Gás",
    expiration: "31/12/2026",
    icon: <Flame className="h-8 w-8 text-white/80" />,
  },
}

const merchants = [
  {
    id: "mercado",
    name: "Supermercado do Silva",
    distance: "A 450m de você",
    address: "Rua das Flores, 123 - Centro",
    verified: true,
  },
  {
    id: "padaria",
    name: "Panificadora e Mercearia Sol",
    distance: "A 1.2 km de você",
    address: "Av. Principal, 404 - Bairro Novo",
    verified: true,
  },
]

export function SocialVoucherWallet() {
  const [currentView, setCurrentView] = useState<View>("login")
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherId>("alimentacao")
  const [qrRefreshKey, setQrRefreshKey] = useState(0)
  
  // Web3 hooks - MetaMask Embedded Wallets (Web3Auth)
  const wallet = useWallet()
  const { balances, totalBalance, isLoading: isLoadingBalances, refetch } = useVoucherBalance()

  // Sincroniza estado de autenticação com o Web3Auth
  const isAuthenticated = wallet.isInitialized

  // Quando autenticado, redireciona para home
  useEffect(() => {
    if (isAuthenticated && currentView === "login") {
      setCurrentView("home")
    }
    if (!isAuthenticated) {
      setCurrentView("login")
    }
  }, [isAuthenticated])

  const handleLogin = async () => {
    // Abre o modal do MetaMask Embedded Wallets
    await wallet.initialize()
  }

  const handleLogout = async () => {
    await wallet.clear()
    setCurrentView("login")
  }

  const handleSelectVoucher = (voucherId: VoucherId) => {
    setSelectedVoucher(voucherId)
    setCurrentView("detail")
  }

  const handleGoToPayment = () => {
    setQrRefreshKey((prev) => prev + 1)
    setCurrentView("payment")
  }

  const voucher = vouchers[selectedVoucher]

  // Show login view without bottom navigation
  if (currentView === "login" || !isAuthenticated) {
    return <LoginView onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Mobile Frame Container */}
      <div className="mx-auto max-w-md">
        {/* Content Area */}
        <div className="relative min-h-screen pb-20">
          {currentView === "home" && (
            <HomeView 
              onSelectVoucher={handleSelectVoucher} 
              onLogout={handleLogout}
              walletAddress={wallet.shortAddress}
              totalBalance={totalBalance}
              isLoadingBalances={isLoadingBalances}
            />
          )}
          {currentView === "detail" && (
            <DetailView
              voucher={voucher}
              onBack={() => setCurrentView("home")}
              onPayment={handleGoToPayment}
            />
          )}
          {currentView === "payment" && (
            <PaymentView
              voucher={voucher}
              refreshKey={qrRefreshKey}
              onBack={() => setCurrentView("detail")}
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-orange-100 bg-white/95 px-6 py-3 backdrop-blur-lg">
          <div className="flex items-center justify-around">
            <NavButton
              icon={<Home className="h-5 w-5" />}
              label="Início"
              active={currentView === "home"}
              onClick={() => setCurrentView("home")}
            />
            <NavButton
              icon={<CreditCard className="h-5 w-5" />}
              label="Voucher"
              active={currentView === "detail"}
              onClick={() => setCurrentView("detail")}
            />
            <NavButton
              icon={<ScanLine className="h-5 w-5" />}
              label="Escanear"
              active={currentView === "payment"}
              onClick={() => setCurrentView("payment")}
            />
          </div>
        </nav>
      </div>
    </div>
  )
}

function LoginView({ onLogin }: { onLogin: () => void }) {
  const { loading } = useWeb3AuthConnect()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-orange-600 to-orange-700 px-4">
      <div className="w-full max-w-sm">
        {/* Logo Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="mb-1 text-center text-2xl font-bold text-white">
            Voucher Social
          </h1>
          <p className="text-center text-orange-100">
            Seus benefícios digitais em um só lugar
          </p>
        </div>

        {/* Login Card */}
        <Card className="rounded-3xl border-0 shadow-2xl">
          <CardContent className="p-6 pt-8">
            <h2 className="mb-1 text-center text-xl font-semibold text-gray-900">
              Acesse sua conta
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Entre com sua conta social ou carteira digital
            </p>

            {/* Web3Auth / MetaMask Embedded Wallets button */}
            <Button
              onClick={onLogin}
              disabled={loading}
              className="h-14 w-full rounded-2xl bg-orange-600 text-base font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Conectando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Entrar com Google / Email / Carteira
                </div>
              )}
            </Button>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Autenticação segura via MetaMask Embedded Wallets</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all",
        active
          ? "bg-orange-100 text-orange-700"
          : "text-gray-500 hover:text-orange-600"
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

function HomeView({
  onSelectVoucher,
  onLogout,
  walletAddress,
  totalBalance,
  isLoadingBalances,
}: {
  onSelectVoucher: (id: VoucherId) => void
  onLogout: () => void
  walletAddress: string
  totalBalance: string
  isLoadingBalances: boolean
}) {
  return (
    <div className="px-5 py-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-orange-200">
            <AvatarImage src="/placeholder.svg?height=48&width=48" alt="Avatar" />
            <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold">
              OR
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Olá, Olivia Rhye</h1>
            <p className="text-sm text-gray-500">
              NIS: <span className="font-mono">•••.•••••.••-•</span>
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 transition-colors hover:bg-orange-200"
          aria-label="Sair"
        >
          <Wallet className="h-5 w-5 text-orange-600" />
        </button>
      </header>

      {/* Voucher NFT Section */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Seus Vouchers Digitais (NFTs Oficiais)
        </h2>
        <div className="flex flex-col gap-4">
          {Object.values(vouchers).map((v) => (
            <VoucherCard
              key={v.id}
              voucher={v}
              onClick={() => onSelectVoucher(v.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function VoucherCard({
  voucher,
  onClick,
}: {
  voucher: Voucher
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 text-left shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
        voucher.gradient
      )}
    >
      <div className="absolute right-4 top-4 opacity-30 transition-opacity group-hover:opacity-50">
        {voucher.icon}
      </div>
      <div className="relative z-10">
        <Badge
          variant="secondary"
          className="mb-2 border-0 bg-white/20 text-xs text-white"
        >
          {voucher.nftSerial}
        </Badge>
        <h3 className="mb-3 text-lg font-semibold leading-tight text-white">
          {voucher.benefitName}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{voucher.balance}</span>
          <span className="text-sm text-white/70">disponível</span>
        </div>
      </div>
    </button>
  )
}

function DetailView({
  voucher,
  onBack,
  onPayment,
}: {
  voucher: Voucher
  onBack: () => void
  onPayment: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-orange-50/95 px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Detalhes do Benefício
          </h1>
        </div>
      </header>

      <div className="flex-1 px-5 py-6">
        {/* NFT Display Card */}
        <Card
          className={cn(
            "mb-6 overflow-hidden border-0 shadow-lg",
            voucher.gradient
          )}
        >
          <CardContent className="p-5">
            <div className="mb-4 flex items-start justify-between">
              <Badge
                variant="secondary"
                className="border-0 bg-white/20 text-xs text-white"
              >
                {voucher.nftSerial}
              </Badge>
              {voucher.icon}
            </div>
            <h2 className="mb-1 text-xl font-bold text-white">
              {voucher.benefitName}
            </h2>
            <p className="mb-4 text-sm text-white/80">
              Categoria: {voucher.category}
            </p>
            <div className="mb-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="mb-1 text-sm text-white/80">Saldo Disponível</p>
              <p className="text-3xl font-bold text-white">{voucher.balance}</p>
            </div>
            <div className="space-y-2 text-sm text-white/90">
              <p className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                ERC-1155 (Selo de Impacto Social)
              </p>
              <p className="font-mono text-xs text-white/70">
                ipfs://bafybeic.../metadata.json
              </p>
              <p>Válido até: {voucher.expiration}</p>
            </div>
          </CardContent>
        </Card>

        {/* Merchant Directory */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            Onde usar este cartão perto de você?
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Estabelecimentos credenciados que aceitam este benefício:
          </p>
          <div className="flex flex-col gap-3">
            {merchants.map((merchant) => (
              <MerchantCard key={merchant.id} merchant={merchant} />
            ))}
          </div>
        </section>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-20 border-t border-orange-100 bg-white/95 p-4 backdrop-blur-lg">
        <Button
          onClick={onPayment}
          className="h-14 w-full rounded-2xl bg-orange-600 text-lg font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 hover:shadow-xl"
        >
          <QrCode className="mr-2 h-5 w-5" />
          Pagar no Estabelecimento
        </Button>
      </div>
    </div>
  )
}

function MerchantCard({
  merchant,
}: {
  merchant: (typeof merchants)[number]
}) {
  return (
    <Card className="border-orange-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
          <Store className="h-6 w-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{merchant.name}</h3>
            {merchant.verified && (
              <BadgeCheck className="h-4 w-4 text-orange-600" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-3 w-3" />
            <span>{merchant.distance}</span>
          </div>
          <p className="text-xs text-gray-400">{merchant.address}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentView({
  voucher,
  refreshKey,
  onBack,
}: {
  voucher: Voucher
  refreshKey: number
  onBack: () => void
}) {
  const { status, scanned, transactionHash, startScan, handleQRResult, confirmPayment, reset } = useQRScanner()

  useEffect(() => {
    reset()
  }, [refreshKey, reset])

  return (
    <div className="flex min-h-screen flex-col bg-orange-50">
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-orange-50/95 px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Escanear para Pagar</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8">

        {/* IDLE — botão para iniciar câmera */}
        {status === "idle" && (
          <Card className="w-full max-w-sm border-0 bg-white shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                <QrCode className="h-10 w-10 text-orange-600" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Pronto para pagar</h2>
              <p className="mb-6 text-sm text-gray-500">
                Aponte a câmera para o QR Code exibido no caixa do estabelecimento.
              </p>
              <Button
                onClick={startScan}
                className="h-14 w-full rounded-2xl bg-orange-600 text-base font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700"
              >
                <ScanLine className="mr-2 h-5 w-5" />
                Abrir Câmera
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SCANNING — câmera ativa */}
        {status === "scanning" && (
          <Card className="w-full max-w-sm border-0 bg-white shadow-xl">
            <CardContent className="p-6">
              <div className="mb-4 text-center">
                <h2 className="mb-1 text-lg font-semibold text-gray-900">Aponte para o QR Code</h2>
                <p className="text-sm text-gray-500">Escaneie o código exibido no caixa do comércio</p>
              </div>

              <div className="mx-auto mb-5 flex justify-center">
                <QrCameraScanner
                  active={status === "scanning"}
                  onScan={handleQRResult}
                  onError={() => reset()}
                />
              </div>

              <Button
                onClick={reset}
                variant="outline"
                className="h-12 w-full rounded-2xl border-gray-200 text-gray-500"
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* REVIEW — confirmar pagamento */}
        {status === "review" && scanned && (
          <Card className="w-full max-w-sm border-0 bg-white shadow-xl">
            <CardContent className="p-6">
              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
                  <Store className="h-7 w-7 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{scanned.merchantName}</h2>
                {scanned.verified && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm text-orange-600">
                    <BadgeCheck className="h-4 w-4" />
                    <span>Comércio credenciado</span>
                  </div>
                )}
              </div>

              <div className="mb-5 rounded-2xl bg-orange-50 p-5 text-center">
                <p className="mb-1 text-sm text-gray-500">Valor a pagar</p>
                <p className="text-4xl font-bold text-orange-600">{scanned.amount}</p>
              </div>

              <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-100 p-3">
                <span className="text-sm text-gray-500">Pagar com</span>
                <Badge
                  variant="secondary"
                  className={cn("border-0 text-white", vouchers[scanned.voucherType].gradient)}
                >
                  {vouchers[scanned.voucherType].benefitName}
                </Badge>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={confirmPayment}
                  className="h-14 w-full rounded-2xl bg-orange-600 text-base font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700"
                >
                  Confirmar Pagamento
                </Button>
                <Button onClick={reset} variant="ghost" className="h-12 w-full rounded-2xl text-gray-500 hover:bg-gray-50">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PROCESSING */}
        {status === "processing" && (
          <Card className="w-full max-w-sm border-0 bg-white shadow-xl">
            <CardContent className="flex flex-col items-center gap-4 p-10">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
              <p className="text-base font-medium text-gray-900">Processando pagamento...</p>
              <p className="text-center text-sm text-gray-500">
                Aguarde enquanto confirmamos a transação com segurança.
              </p>
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {status === "success" && scanned && (
          <Card className="w-full max-w-sm border-0 bg-white shadow-xl">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <CheckCircle2 className="h-9 w-9 text-orange-600" />
              </div>
              <h2 className="mb-1 text-xl font-bold text-gray-900">Pagamento aprovado!</h2>
              <p className="mb-5 text-sm text-gray-500">
                {scanned.amount} pagos para {scanned.merchantName}
              </p>

              {transactionHash && (
                <div className="mb-5 w-full rounded-xl bg-gray-50 p-3">
                  <p className="mb-1 text-xs text-gray-400">Comprovante blockchain</p>
                  <p className="break-all font-mono text-xs text-gray-600">
                    {transactionHash.slice(0, 22)}...
                  </p>
                </div>
              )}

              <div className="flex w-full flex-col gap-2">
                <Button
                  onClick={reset}
                  className="h-14 w-full rounded-2xl bg-orange-600 text-base font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700"
                >
                  Novo Pagamento
                </Button>
                <Button onClick={onBack} variant="ghost" className="h-12 w-full rounded-2xl text-gray-500 hover:bg-gray-50">
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badge de segurança */}
        {status !== "success" && (
          <Card className="mt-4 w-full max-w-sm border-orange-200 bg-orange-50">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-800">Pagamento Seguro</p>
                <p className="text-xs text-orange-700">
                  Confira sempre o nome do comércio e o valor antes de confirmar.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
