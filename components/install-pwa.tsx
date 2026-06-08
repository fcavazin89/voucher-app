'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verifica se já está instalado (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Verifica se já dispensou o banner
    const dismissed = sessionStorage.getItem('pwa-banner-dismissed')
    if (dismissed) return

    // Detecta iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      // No iOS não há evento beforeinstallprompt — exibe instrução manual
      setShowBanner(true)
      return
    }

    // Captura o evento de instalação nativo (Chrome/Android/Edge/etc.)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setShowBanner(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (!showBanner || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">
      <div className="flex items-start gap-3">
        {/* Ícone do app */}
        <img
          src="/icons/icon-96x96.png"
          alt="Voucher Social"
          className="h-12 w-12 rounded-xl"
        />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Instalar Voucher Social</p>

          {isIOS ? (
            <p className="mt-0.5 text-xs text-gray-500 leading-snug">
              Toque em <strong>Compartilhar</strong>{' '}
              <span className="inline-block">⬆️</span> e depois{' '}
              <strong>"Adicionar à Tela de Início"</strong>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500 leading-snug">
              Instale o app para acessar offline e receber notificações.
            </p>
          )}

          {!isIOS && (
            <Button
              size="sm"
              className="mt-2 h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 gap-1.5"
              onClick={handleInstall}
            >
              <Download className="h-3.5 w-3.5" />
              Instalar agora
            </Button>
          )}
        </div>

        {/* Fechar */}
        <button
          onClick={handleDismiss}
          className="mt-0.5 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
