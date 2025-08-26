import { useEffect, useState } from 'react'

const KEY_DIESEL = 'fuel_price_diesel'

export function getFuelPriceDiesel(): number | null {
  try {
    const raw = localStorage.getItem(KEY_DIESEL)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch { return null }
}

export function setFuelPriceDiesel(price: number) {
  try { localStorage.setItem(KEY_DIESEL, String(price)) } catch {}
  window.dispatchEvent(new Event('storage'))
}

export function useFuelPriceDiesel(): [number | null, (n: number) => void] {
  const [price, setPrice] = useState<number | null>(() => getFuelPriceDiesel())
  useEffect(() => {
    const onStorage = () => setPrice(getFuelPriceDiesel())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return [price, (n: number) => setFuelPriceDiesel(n)]
}

