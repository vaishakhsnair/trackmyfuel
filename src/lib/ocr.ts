import * as Tesseract from 'tesseract.js'
import exifr from 'exifr'

export type OCRResult = { text: string; odometer?: number; confidence?: number }
export type ExifResult = { takenAt?: number; lat?: number; lon?: number }

export async function extractExif(file: Blob): Promise<ExifResult> {
  try {
    const data: any = await exifr.parse(file as any, { gps: true, tiff: true, exif: true })
    const takenAt = (data?.DateTimeOriginal || data?.CreateDate)?.getTime?.() || undefined
    const lat = data?.latitude
    const lon = data?.longitude
    return { takenAt, lat, lon }
  } catch {
    return {}
  }
}

export async function compressImageToJpeg(file: Blob, maxSize = 1600, quality = 0.8): Promise<Blob> {
  const supportsCreateImageBitmap = typeof createImageBitmap === 'function'
  const useOffscreen = typeof (globalThis as any).OffscreenCanvas === 'function'
  if (supportsCreateImageBitmap) {
    try {
      const bitmap = await createImageBitmap(file as any)
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)
      if (useOffscreen) {
        const canvas = new OffscreenCanvas(w, h)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0, w, h)
        return await canvas.convertToBlob({ type: 'image/jpeg', quality })
      } else {
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0, w, h)
        const blob: Blob = await new Promise((res) => canvas.toBlob(b => res(b as Blob), 'image/jpeg', quality)!)
        return blob
      }
    } catch {/* fall through */}
  }
  // Fallback path without createImageBitmap
  const img = await blobToImage(file)
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const blob: Blob = await new Promise((res) => canvas.toBlob(b => res(b as Blob), 'image/jpeg', quality)!)
  return blob
}

async function blobToImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url })
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

export async function preprocessForOCR(file: Blob): Promise<HTMLCanvasElement> {
  const img = new Image()
  const url = URL.createObjectURL(file)
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = rej
    img.src = url
  })
  URL.revokeObjectURL(url)
  const maxW = 1200
  const scale = Math.min(1, maxW / img.width)
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = w
  canvas.height = h
  ctx.drawImage(img, 0, 0, w, h)
  const imgData = ctx.getImageData(0, 0, w, h)
  // Simple grayscale + threshold
  for (let i = 0; i < imgData.data.length; i += 4) {
    const r = imgData.data[i]
    const g = imgData.data[i + 1]
    const b = imgData.data[i + 2]
    const gray = (r * 0.299 + g * 0.587 + b * 0.114) | 0
    const v = gray > 160 ? 255 : 0
    imgData.data[i] = v
    imgData.data[i + 1] = v
    imgData.data[i + 2] = v
  }
  ctx.putImageData(imgData, 0, 0)
  return canvas
}

export function sanitizeOdometer(text: string): number | undefined {
  const digits = text.replace(/[^0-9]/g, '')
  if (!digits) return undefined
  // Typical odo lengths 4-7 digits
  const match = digits.match(/(\d{4,7})/)
  if (!match) return undefined
  const num = parseInt(match[1], 10)
  if (Number.isNaN(num)) return undefined
  return num
}

export async function runOCR(file: Blob): Promise<OCRResult> {
  const canvas = await preprocessForOCR(file)
  const dataUrl = canvas.toDataURL('image/png')
  const { data } = await Tesseract.recognize(dataUrl, 'eng', {
    tessedit_char_whitelist: '0123456789',
  } as any)
  const text = data?.text || ''
  const odometer = sanitizeOdometer(text)
  const confidence = data?.confidence
  return { text, odometer, confidence }
}
