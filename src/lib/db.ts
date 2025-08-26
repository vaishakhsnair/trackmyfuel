import Dexie, { Table } from 'dexie'

export type Bike = {
  id: string
  name: string
  plate?: string
  updated_at: number
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error'

export type Refuel = {
  local_id: string
  bike_local_id: string
  server_id?: string
  odometer_km: number
  rupees?: number
  price_per_litre?: number
  litres?: number
  full_tank: boolean
  note?: string
  photo_blob?: Blob
  photo_exif_time?: number
  photo_lat?: number
  photo_lon?: number
  ocr_confidence?: number
  created_at: number
  updated_at: number
  sync_status: SyncStatus
  last_error?: string
}

class TrackMyFuelDB extends Dexie {
  bikes!: Table<Bike, string>
  refuels!: Table<Refuel, string>

  constructor() {
    super('trackmyfuel')
    this.version(1).stores({
      bikes: 'id, name, plate, updated_at',
      refuels:
        'local_id, server_id, bike_local_id, odometer_km, created_at, updated_at, sync_status'
    })
  }
}

export const db = new TrackMyFuelDB()

export async function ensureDefaultBike(): Promise<Bike> {
  const id = 'default'
  const existing = await db.bikes.get(id)
  if (existing) return existing
  const bike: Bike = { id, name: 'My Bike', updated_at: Date.now() }
  await db.bikes.put(bike)
  return bike
}

export type NewRefuelInput = Omit<Refuel, 'local_id' | 'created_at' | 'updated_at' | 'sync_status'> & {
  local_id?: string
}

export async function addRefuel(input: NewRefuelInput): Promise<string> {
  const local_id = input.local_id || crypto.randomUUID()
  const now = Date.now()
  const row: Refuel = {
    local_id,
    bike_local_id: input.bike_local_id,
    server_id: input.server_id,
    odometer_km: input.odometer_km,
    rupees: input.rupees,
    price_per_litre: input.price_per_litre,
    litres: input.litres,
    full_tank: input.full_tank,
    note: input.note,
    photo_blob: input.photo_blob,
    photo_exif_time: input.photo_exif_time,
    photo_lat: input.photo_lat,
    photo_lon: input.photo_lon,
    ocr_confidence: input.ocr_confidence,
    created_at: now,
    updated_at: now,
    sync_status: 'pending'
  }
  await db.refuels.put(row)
  return local_id
}

export async function updateRefuel(local_id: string, patch: Partial<Refuel>) {
  patch.updated_at = Date.now()
  await db.refuels.update(local_id, patch)
}

export async function listRefuels() {
  return db.refuels.orderBy('created_at').reverse().toArray()
}

export async function getLastRefuels(limit = 50) {
  return db.refuels.orderBy('created_at').reverse().limit(limit).toArray()
}

export async function markSyncing(local_id: string) {
  await updateRefuel(local_id, { sync_status: 'syncing', last_error: undefined })
}

export async function markSynced(local_id: string, server_id: string) {
  await updateRefuel(local_id, { sync_status: 'synced', server_id, last_error: undefined })
}

export async function markSyncError(local_id: string, error: string) {
  await updateRefuel(local_id, { sync_status: 'error', last_error: error })
}

export async function getPendingRefuels() {
  return db.refuels.where('sync_status').anyOf('pending', 'error').toArray()
}

export async function upsertFromDrive(r: Refuel) {
  const existing = await db.refuels.get(r.local_id)
  if (!existing) {
    await db.refuels.put({ ...r, sync_status: r.sync_status || 'synced' })
    return
  }
  if (r.updated_at > (existing.updated_at || 0)) {
    await db.refuels.put({ ...existing, ...r, sync_status: 'synced' })
  }
}

export function computeFullToFullEfficiency(entries: Refuel[]): { distanceKm: number; litres: number; efficiency: number | null } {
  if (entries.length < 2) return { distanceKm: 0, litres: 0, efficiency: null }
  // Entries expected newest first
  const newestFullIdx = entries.findIndex(e => e.full_tank)
  if (newestFullIdx < 0) return { distanceKm: 0, litres: 0, efficiency: null }
  const newer = entries[newestFullIdx]
  const olderFullIdx = entries.slice(newestFullIdx + 1).findIndex(e => e.full_tank)
  if (olderFullIdx < 0) return { distanceKm: 0, litres: 0, efficiency: null }
  const older = entries[newestFullIdx + 1 + olderFullIdx]
  const segment = entries.slice(newestFullIdx + 1 + olderFullIdx + 1, newestFullIdx + 1) // between old(exclusive) and new(inclusive)
  const litres = segment.reduce((sum, e) => sum + (e.litres || 0), 0)
  const distanceKm = newer.odometer_km - older.odometer_km
  const efficiency = litres > 0 ? distanceKm / litres : null
  return { distanceKm, litres, efficiency }
}

export function computeSinceLastFull(entries: Refuel[]): { distanceKm: number; litres: number; efficiency: number | null } {
  if (entries.length === 0) return { distanceKm: 0, litres: 0, efficiency: null }
  const lastFullIdx = entries.findIndex(e => e.full_tank)
  if (lastFullIdx < 0) return { distanceKm: 0, litres: 0, efficiency: null }
  const start = entries[lastFullIdx]
  const end = entries[0]
  const between = entries.slice(0, lastFullIdx) // newer than start
  const litres = between.reduce((sum, e) => sum + (e.litres || 0), 0)
  const distanceKm = end.odometer_km - start.odometer_km
  const efficiency = litres > 0 ? distanceKm / litres : null
  return { distanceKm, litres, efficiency }
}

export function computeRolling(entries: Refuel[], days: number) {
  const cutoff = Date.now() - days * 86400_000
  const window = entries.filter(e => e.created_at >= cutoff)
  if (window.length < 2) return { distanceKm: 0, litres: 0, cost: 0, efficiency: null }
  const distanceKm = window[0].odometer_km - window[window.length - 1].odometer_km
  const litres = window.reduce((s, e) => s + (e.litres || 0), 0)
  const cost = window.reduce((s, e) => s + (e.rupees || 0), 0)
  const efficiency = litres > 0 ? distanceKm / litres : null
  return { distanceKm, litres, cost, efficiency }
}

