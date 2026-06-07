/**
 * Gera ícones PWA em múltiplos tamanhos a partir do apple-icon.png.
 * Requer: pnpm approve-builds (para sharp) ou instalar jimp como fallback.
 * 
 * Execute: node scripts/generate-icons.mjs
 */
import { createCanvas, loadImage } from 'canvas'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const iconsDir = join(root, 'public', 'icons')

if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true })

const sourceImage = join(root, 'public', 'apple-icon.png')

const image = await loadImage(sourceImage)

for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, size, size)
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(join(iconsDir, `icon-${size}x${size}.png`), buffer)
  console.log(`✓ icon-${size}x${size}.png`)
}

console.log('Ícones gerados em public/icons/')
