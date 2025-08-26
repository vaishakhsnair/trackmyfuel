// lib/googleAuth.ts
export type GoogleAuthState = {
  ready: boolean
  accessToken?: string
  expiresAt?: number
  email?: string
}

let tokenClient: any | null = null
let state: GoogleAuthState = { ready: false }
const listeners = new Set<(s: GoogleAuthState) => void>()

function emit() { listeners.forEach(fn => fn({ ...state })) }

export function onAuthStateChanged(cb: (s: GoogleAuthState) => void) {
  listeners.add(cb)
  cb({ ...state })
  return () => listeners.delete(cb)
}

async function loadScript() {
  if ((window as any).google?.accounts?.oauth2) return
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script")
    s.src = "https://accounts.google.com/gsi/client"
    s.async = true
    s.onload = () => res()
    s.onerror = rej
    document.head.appendChild(s)
  })
}

export async function initGoogleAuth() {
  await loadScript()
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (import.meta as any).env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) {
    console.error('Google Client ID missing. Set VITE_GOOGLE_CLIENT_ID in .env.local')
  }
  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
    callback: (resp: any) => {
      if (resp.error) return
      const now = Date.now()
      state = {
        ready: true,
        accessToken: resp.access_token,
        expiresAt: now + (resp.expires_in * 1000) - 10_000,
      }
      fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${state.accessToken}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(info => { if (info?.email) state.email = info.email; emit() })
        .catch(() => emit())
    }
  })
  state.ready = true
  emit()
}

export function signIn() {
  if (!tokenClient) {
    console.error('Google auth not ready. Check client ID and network.')
    return
  }
  tokenClient.requestAccessToken({ prompt: "consent" })
}

export function signOut() {
  state = { ready: true }
  emit()
}

export function getAccessToken() {
  return state.accessToken
}
