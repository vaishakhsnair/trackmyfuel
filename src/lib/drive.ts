import { getAccessToken } from "./googleAuth"
import { Refuel, getPendingRefuels, markSynced, markSyncError, markSyncing, upsertFromDrive } from './db'

const DRIVE_BASE = "https://www.googleapis.com/drive/v3"
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3"

async function api(path: string, init: RequestInit = {}) {
  const token = getAccessToken()
  if (!token) throw new Error("Not signed in")
  const res = await fetch(`${DRIVE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  })
  if (!res.ok) throw new Error(`Drive API ${res.status}`)
  return res.json()
}

async function uploadMultipart(meta: any, blob: Blob) {
  const token = getAccessToken()
  if (!token) throw new Error("No token")
  const form = new FormData()
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }))
  form.append("file", blob)
  const res = await fetch(`${UPLOAD_BASE}/files?uploadType=multipart`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  })
  if (!res.ok) throw new Error("Upload failed")
  return res.json()
}

export async function ensureFolder(name: string, parentId?: string): Promise<string> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false ${parentId ? `and '${parentId}' in parents` : ""}`
  )
  const r = await api(`/files?q=${q}&fields=files(id,name)`)
  if (r.files?.length) return r.files[0].id
  const created = await api(`/files?fields=id,name`, {
    method: "POST",
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined })
  })
  return created.id
}

export async function uploadJson(folderId: string, fileName: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" })
  return uploadMultipart({ name: fileName, parents: [folderId] }, blob)
}

export async function uploadPhoto(folderId: string, fileName: string, blob: Blob) {
  return uploadMultipart({ name: fileName, parents: [folderId] }, blob)
}

export type DriveFolders = { rootId: string; photosId: string; dataId: string }

export async function ensureFolders(): Promise<DriveFolders> {
  const rootId = await ensureFolder('Bike Mileage (App)')
  const photosId = await ensureFolder('photos', rootId)
  const dataId = await ensureFolder('data', rootId)
  return { rootId, photosId, dataId }
}

export async function syncPendingToDrive() {
  const token = getAccessToken()
  if (!token) return
  const pending = await getPendingRefuels()
  if (pending.length === 0) return
  const folders = await ensureFolders()
  for (const row of pending) {
    try {
      await markSyncing(row.local_id)
      if (row.photo_blob) {
        await uploadPhoto(folders.photosId, `${row.local_id}.jpg`, row.photo_blob)
      }
      const payload: Refuel = { ...row, photo_blob: undefined, sync_status: 'synced' }
      const res = await uploadJson(folders.dataId, `${row.local_id}.json`, payload)
      await markSynced(row.local_id, res.id)
    } catch (e: any) {
      await markSyncError(row.local_id, String(e?.message || e))
    }
  }
  try { localStorage.setItem('last_sync_at', String(Date.now())) } catch {}
}

export async function restoreData(): Promise<number> {
  const token = getAccessToken()
  if (!token) throw new Error('Not signed in')
  const { dataId } = await ensureFolders()
  const q = encodeURIComponent(`'${dataId}' in parents and mimeType='application/json' and trashed=false`)
  const list = await api(`/files?q=${q}&fields=files(id,name,mimeType,size)`) as any
  const files: any[] = list.files || []
  let count = 0
  for (const f of files) {
    try {
      const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!resp.ok) continue
      const obj = await resp.json()
      if (obj && obj.local_id) {
        await upsertFromDrive(obj as Refuel)
        count++
      }
    } catch {
      // continue
    }
  }
  return count
}
