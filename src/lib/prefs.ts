import { useEffect, useState } from 'react'
import { Bike, db, ensureDefaultBike } from './db'
import { useLiveQuery } from 'dexie-react-hooks'

const ACTIVE_KEY = 'active_bike_id'

export function getActiveBikeId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
}

export function setActiveBikeId(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id) } catch {}
  window.dispatchEvent(new Event('storage'))
}

export function useActiveBikeId() {
  const [id, setId] = useState<string | null>(() => getActiveBikeId())
  useEffect(() => {
    const onStorage = () => setId(getActiveBikeId())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return [id, setActiveBikeId] as const
}

export function useActiveBike(): [Bike | undefined, (id: string) => void] {
  const [activeId, setActive] = useActiveBikeId()
  const bike = useLiveQuery(async () => {
    let id = activeId
    if (!id) {
      const b = await ensureDefaultBike()
      id = b.id
      setActive(b.id)
    }
    return id ? db.bikes.get(id) : undefined
  }, [activeId], undefined)
  return [bike, setActive]
}

