import { useState } from 'react'
import { ArrowLeft, Bike, Star, StarOff, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from 'react-router-dom'
import { Bike as BikeModel, db } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { setActiveBikeId, useActiveBikeId } from '@/lib/prefs'

const Bikes = () => {
  const [activeId] = useActiveBikeId()
  const bikes = useLiveQuery(async () => db.bikes.toArray(), [], []) as BikeModel[]
  const [name, setName] = useState('')
  const [plate, setPlate] = useState('')

  async function addBike() {
    if (!name.trim()) return
    const id = crypto.randomUUID()
    await db.bikes.put({ id, name: name.trim(), plate: plate || undefined, updated_at: Date.now() })
    setName(''); setPlate('')
  }

  async function setActive(id: string) { setActiveBikeId(id) }

  async function rename(b: BikeModel, newName: string) {
    await db.bikes.update(b.id, { name: newName.trim(), updated_at: Date.now() })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link to="/profile">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-primary to-primary-glow rounded-lg"><Bike className="w-6 h-6 text-primary-foreground" /></div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Manage Bikes</h1>
                <p className="text-sm text-muted-foreground">Add and switch bikes</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="metric-card p-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pulsar 150" />
            </div>
            <div>
              <Label htmlFor="plate">Plate</Label>
              <Input id="plate" value={plate} onChange={e => setPlate(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex items-end">
              <Button onClick={addBike} className="w-full flex items-center gap-2"><Plus className="w-4 h-4"/>Add Bike</Button>
            </div>
          </div>
        </Card>
        <div className="space-y-3">
          {(bikes || []).map(b => (
            <Card key={b.id} className="metric-card p-4 flex items-center justify-between">
              <div className="space-y-1">
                <Input defaultValue={b.name} onBlur={(e) => rename(b, e.target.value)} />
                <div className="text-xs text-muted-foreground">{b.plate || '—'}</div>
              </div>
              <div>
                {activeId === b.id ? (
                  <Button variant="secondary" className="flex items-center gap-2"><Star className="w-4 h-4"/> Active</Button>
                ) : (
                  <Button variant="outline" onClick={() => setActive(b.id)} className="flex items-center gap-2"><StarOff className="w-4 h-4"/> Set Active</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Bikes

