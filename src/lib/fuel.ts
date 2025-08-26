export type FuelPrice = { price: number; source?: string }

// Attempts to fetch current diesel price for Kerala.
// 1) Uses env override if provided
// 2) Tries a public community endpoint (may be unstable)
// 3) Fallback to a sane default
export async function fetchDieselPriceKerala(): Promise<FuelPrice> {
  // 1) Env-provided endpoint expected to return { price: number }
  const override = (import.meta as any).env?.VITE_FUEL_PRICE_URL
  if (override) {
    try {
      const r = await fetch(override)
      if (r.ok) {
        const j = await r.json()
        const price = Number(j.price || j.diesel || j.value)
        if (price > 0) return { price, source: 'env' }
      }
    } catch {}
  }

  // 2) Community endpoint (best-effort, may change)
  try {
    const url = 'https://fuelprice-api-india.vercel.app/v1/state/Kerala?fuel=diesel'
    const r = await fetch(url, { cache: 'no-cache' })
    if (r.ok) {
      const j = await r.json()
      // attempt multiple shapes
      const price = Number(j?.price ?? j?.data?.price ?? j?.diesel)
      if (price > 0) return { price, source: 'community' }
    }
  } catch {}

  // 3) Fallback default; user can edit later
  return { price: 105, source: 'fallback' }
}

