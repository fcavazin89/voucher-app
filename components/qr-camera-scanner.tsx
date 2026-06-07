"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { CameraOff, RefreshCw, ScanLine } from "lucide-react"

interface QrCameraScannerProps {
  onScan: (result: string) => void
  onError?: (error: string) => void
  active: boolean
}

// ─── Detecta suporte a BarcodeDetector nativo (Android Chrome 83+) ───────────
const hasBarcodeDetector =
  typeof window !== "undefined" && "BarcodeDetector" in window

// ─── Intervalo de scan em ms ──────────────────────────────────────────────────
const SCAN_INTERVAL_MS = 250

export function QrCameraScanner({ onScan, onError, active }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastScanRef = useRef<number>(0)
  const detectorRef = useRef<any>(null)
  const zxingRef = useRef<any>(null)
  const mountedRef = useRef(true)

  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  // ─── Para câmera e libera recursos ────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // ─── Loop de scan com BarcodeDetector nativo (Android Chrome) ─────────────
  const scanLoopNative = useCallback(() => {
    if (!mountedRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanLoopNative)
      return
    }

    const now = Date.now()
    if (now - lastScanRef.current < SCAN_INTERVAL_MS) {
      animFrameRef.current = requestAnimationFrame(scanLoopNative)
      return
    }
    lastScanRef.current = now

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    detectorRef.current
      .detect(canvas)
      .then((barcodes: any[]) => {
        if (!mountedRef.current) return
        const qr = barcodes.find((b: any) => b.format === "qr_code")
        if (qr?.rawValue) {
          stopCamera()
          onScan(qr.rawValue)
          return
        }
        animFrameRef.current = requestAnimationFrame(scanLoopNative)
      })
      .catch(() => {
        if (mountedRef.current) {
          animFrameRef.current = requestAnimationFrame(scanLoopNative)
        }
      })
  }, [onScan, stopCamera])

  // ─── Loop de scan com ZXing (fallback iOS / desktop) ──────────────────────
  const scanLoopZXing = useCallback(() => {
    if (!mountedRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanLoopZXing)
      return
    }

    const now = Date.now()
    if (now - lastScanRef.current < SCAN_INTERVAL_MS) {
      animFrameRef.current = requestAnimationFrame(scanLoopZXing)
      return
    }
    lastScanRef.current = now

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const result = zxingRef.current?.decode(
        imageData.data,
        canvas.width,
        canvas.height,
        "RGBA_8888"
      )
      if (result) {
        stopCamera()
        onScan(result)
        return
      }
    } catch {
      // frame sem QR — normal
    }

    animFrameRef.current = requestAnimationFrame(scanLoopZXing)
  }, [onScan, stopCamera])

  // ─── Inicia câmera e scanner ───────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!mountedRef.current || isStarting) return
    setIsStarting(true)
    setCameraError(null)

    try {
      // Prefere câmera traseira no mobile
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      streamRef.current = stream

      // Verifica suporte a lanterna
      const videoTrack = stream.getVideoTracks()[0]
      const capabilities = videoTrack.getCapabilities?.() as any
      setTorchSupported(!!capabilities?.torch)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Escolhe engine de scan
      if (hasBarcodeDetector) {
        // BarcodeDetector nativo — Android Chrome, Samsung Internet
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        })
        animFrameRef.current = requestAnimationFrame(scanLoopNative)
      } else {
        // ZXing — iOS Safari, Firefox, desktop
        const { BrowserQRCodeReader } = await import("@zxing/browser")
        zxingRef.current = new BrowserQRCodeReader()

        // ZXing tem API própria para video, mais eficiente que canvas loop
        const controls = await zxingRef.current.decodeFromVideoElement(
          videoRef.current!,
          (result: any, err: any) => {
            if (!mountedRef.current) return
            if (result) {
              controls?.stop()
              stopCamera()
              onScan(result.getText())
            }
            // Ignora erros normais de frame vazio
          }
        )
      }
    } catch (err: any) {
      if (!mountedRef.current) return
      const msg =
        err?.name === "NotAllowedError"
          ? "Permissão de câmera negada. Habilite nas configurações do navegador."
          : err?.name === "NotFoundError"
          ? "Nenhuma câmera encontrada neste dispositivo."
          : err?.name === "NotReadableError"
          ? "Câmera em uso por outro aplicativo."
          : err?.name === "OverconstrainedError"
          ? "Câmera não suporta a configuração solicitada."
          : `Erro ao acessar a câmera: ${err?.message || "desconhecido"}`
      setCameraError(msg)
      onError?.(msg)
    } finally {
      if (mountedRef.current) setIsStarting(false)
    }
  }, [isStarting, onScan, onError, stopCamera, scanLoopNative])

  // ─── Liga/desliga lanterna ────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] })
      setTorchOn((prev) => !prev)
    } catch {
      // lanterna não suportada
    }
  }, [torchOn])

  // ─── Efeito: ativa/desativa câmera ────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    if (active) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      mountedRef.current = false
      stopCamera()
    }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Tela de erro ────────────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div className="relative flex h-64 w-64 flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-gray-900 text-center px-4">
        <CameraOff className="h-10 w-10 text-orange-400" />
        <p className="text-sm text-gray-300">{cameraError}</p>
        <button
          onClick={() => {
            setCameraError(null)
            startCamera()
          }}
          className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
        >
          <RefreshCw className="h-3 w-3" />
          Tentar novamente
        </button>
      </div>
    )
  }

  // ─── Viewfinder ──────────────────────────────────────────────────────────
  return (
    <div className="relative mx-auto flex h-72 w-72 items-center justify-center overflow-hidden rounded-3xl bg-gray-900">
      {/* Cantos decorativos */}
      <div className="absolute left-4 top-4 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-orange-400 z-10" />
      <div className="absolute right-4 top-4 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-orange-400 z-10" />
      <div className="absolute bottom-4 left-4 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-orange-400 z-10" />
      <div className="absolute bottom-4 right-4 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-orange-400 z-10" />

      {/* Linha de scan animada */}
      {active && !isStarting && (
        <div
          className="absolute left-6 right-6 z-10 h-0.5 bg-orange-400"
          style={{
            boxShadow: "0 0 12px 4px rgba(251,146,60,0.6)",
            animation: "scanLine 2s ease-in-out infinite",
          }}
        />
      )}

      {/* Video preview */}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Canvas oculto para processamento */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Botão lanterna */}
      {torchSupported && active && !isStarting && (
        <button
          onClick={toggleTorch}
          className={`absolute bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            torchOn ? "bg-orange-400 text-gray-900" : "bg-gray-800/80 text-orange-400"
          }`}
          aria-label="Lanterna"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
          </svg>
        </button>
      )}

      {/* Overlay carregando */}
      {isStarting && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-gray-900/90">
          <ScanLine className="h-8 w-8 animate-pulse text-orange-400" />
          <p className="text-xs text-gray-300">Iniciando câmera...</p>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 20%; }
          50% { top: 75%; }
        }
      `}</style>
    </div>
  )
}
