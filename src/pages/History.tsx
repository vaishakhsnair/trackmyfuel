import { useState } from "react";
import { ArrowLeft, Search, TrendingUp, Calendar, Fuel, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { TrendIndicator } from "@/components/TrendIndicator";
import { useLiveQuery } from "dexie-react-hooks";
import { Refuel, db } from "@/lib/db";
import { useActiveBike } from "@/lib/prefs";
import { restoreData } from "@/lib/drive";
import { useToast } from "@/hooks/use-toast";

const History = () => {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("");
  const [activeBike] = useActiveBike()
  const entries = useLiveQuery(async () => db.refuels.orderBy('created_at').reverse().toArray(), [], []) as Refuel[]
  const filteredEntries = (entries || [])
    .filter(e => !activeBike || e.bike_local_id === activeBike.id)
    .filter(e => String(e.odometer_km).includes(searchTerm))

  const getEfficiencyTrend = (curr?: number, prev?: number) => {
    if (!curr || !prev) return null
    const change = ((curr - prev) / prev) * 100
    return Math.round(change * 10) / 10
  }

  async function onRestore() {
    try {
      const n = await restoreData()
      toast({ title: 'Restore complete', description: `Merged ${n} entries from Drive` })
    } catch (e: any) {
      toast({ title: 'Restore failed', description: String(e?.message || e), variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-primary to-primary-glow rounded-lg">
                <Calendar className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Fuel History</h1>
                <p className="text-sm text-muted-foreground">{filteredEntries.length} entries total {activeBike ? `• ${activeBike.name}` : ''}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by date or odometer reading..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="default" onClick={onRestore}>
            Restore from Drive
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="metric-card p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Fuel className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Avg Efficiency</span>
            </div>
            <div className="text-2xl font-bold text-card-foreground">
              {(() => {
                const arr = entries || []
                if (arr.length < 2) return '—'
                const dist = arr[0].odometer_km - arr[arr.length - 1].odometer_km
                const litres = arr.reduce((s, e) => s + (e.litres || 0), 0)
                return litres > 0 ? `${(dist / litres).toFixed(1)} km/L` : '—'
              })()}
            </div>
          </Card>
          
          <Card className="metric-card p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Spent</span>
            </div>
            <div className="text-2xl font-bold text-card-foreground">₹{(entries || []).reduce((s, e) => s + (e.rupees || 0), 0).toFixed(2)}</div>
          </Card>
          
          <Card className="metric-card p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Distance</span>
            </div>
            <div className="text-2xl font-bold text-card-foreground">
              {(() => {
                const arr = entries || []
                if (arr.length < 2) return '0 km'
                return `${(arr[0].odometer_km - arr[arr.length - 1].odometer_km).toLocaleString()} km`
              })()}
            </div>
          </Card>
        </div>

        {/* Entries List */}
        <div className="space-y-4">
          {filteredEntries.map((entry, index) => {
            const prev = filteredEntries[index + 1]
            const distance = prev ? entry.odometer_km - prev.odometer_km : 0
            const efficiency = entry.litres ? (distance > 0 ? distance / entry.litres : undefined) : undefined
            const prevEff = prev && prev.litres && filteredEntries[index + 2]
              ? ((prev.odometer_km - filteredEntries[index + 2].odometer_km) / (prev.litres || 1))
              : undefined
            const effTrend = getEfficiencyTrend(efficiency, prevEff)
            
            return (
              <Card key={entry.local_id} className="metric-card p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Fuel className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-card-foreground">
                          {new Date(entry.created_at).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Odometer: {entry.odometer_km.toLocaleString()} km
                        </div>
                      </div>
                    </div>
                    
                    {effTrend != null && (
                      <TrendIndicator
                        value={effTrend}
                        period="vs last"
                      />
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-card-foreground">
                        ₹{(entry.rupees || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Money Spent</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-card-foreground">
                        {(entry.litres || 0).toFixed(2)}L
                      </div>
                      <div className="text-xs text-muted-foreground">Fuel Added</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-card-foreground">
                        {distance} km
                      </div>
                      <div className="text-xs text-muted-foreground">Distance</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-card-foreground">
                        {efficiency ? efficiency.toFixed(1) : '—'} km/L
                      </div>
                      <div className="text-xs text-muted-foreground">Efficiency</div>
                    </div>
                  </div>

                  {/* Cost per km badge */}
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      {distance > 0 && entry.rupees ? `₹${(entry.rupees / distance).toFixed(2)}/km` : '—'}
                    </Badge>
                    <Badge variant={entry.sync_status === 'synced' ? 'secondary' : entry.sync_status === 'error' ? 'destructive' : 'outline'} className="text-xs">
                      {entry.sync_status}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Load More */}
        <div className="text-center pt-4">
          <Button variant="outline" className="px-8">
            Load More Entries
          </Button>
        </div>
      </main>
    </div>
  );
};

export default History;
