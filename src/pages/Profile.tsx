import { useEffect, useState } from 'react'
import { ArrowLeft, User, LogIn, LogOut, RefreshCw, Mail, Fuel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { GoogleAuthState, onAuthStateChanged, signIn, signOut } from '@/lib/googleAuth'
import { syncPendingToDrive } from '@/lib/drive'
import { useFuelPriceDiesel } from '@/lib/settings'

const Profile = () => {
  const [auth, setAuth] = useState<GoogleAuthState>({ ready: false })
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [fuelPrice, setFuelPrice] = useFuelPriceDiesel()
  useEffect(() => {
    const unsub = onAuthStateChanged(setAuth)
    const ls = localStorage.getItem('last_sync_at')
    setLastSync(ls ? parseInt(ls, 10) : null)
    return () => unsub()
  }, [])
  async function doSync() {
    setSyncing(true)
    try {
      await syncPendingToDrive()
      const at = Date.now()
      localStorage.setItem('last_sync_at', String(at))
      setLastSync(at)
    } finally { setSyncing(false) }
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link to="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-primary to-primary-glow rounded-lg"><User className="w-6 h-6 text-primary-foreground" /></div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Profile</h1>
                <p className="text-sm text-muted-foreground">Account & Sync</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 space-y-4">
        <Card className="metric-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4"/><span>Email</span></div>
          <div className="text-lg text-card-foreground">{auth.email || 'Not signed in'}</div>
          <div className="flex gap-2 pt-2">
            {!auth.accessToken ? (
              <Button onClick={() => signIn()} className="flex items-center gap-2"><LogIn className="w-4 h-4"/> Sign In</Button>
            ) : (
              <Button variant="outline" onClick={() => signOut()} className="flex items-center gap-2"><LogOut className="w-4 h-4"/> Sign Out</Button>
            )}
            <Button variant="outline" onClick={doSync} disabled={syncing} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4"/>{syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </Card>
        <Card className="metric-card p-6">
          <div className="text-sm text-muted-foreground">Last Sync</div>
          <div className="text-lg text-card-foreground">{lastSync ? new Date(lastSync).toLocaleString() : '—'}</div>
        </Card>
        <Card className="metric-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground"><Fuel className="w-4 h-4"/><span>Petrol Price (₹/L)</span></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input type="number" step="0.01" value={fuelPrice ?? ''} onChange={(e) => setFuelPrice(Number(e.target.value || 0))} placeholder="e.g. 105" />
            <div className="text-xs text-muted-foreground md:col-span-2">This price will be used to prefill Add Entry. You can still override per entry.</div>
          </div>
        </Card>
        <Link to="/bikes">
          <Button variant="outline" className="w-full">Manage Bikes</Button>
        </Link>
      </main>
    </div>
  )
}

export default Profile
