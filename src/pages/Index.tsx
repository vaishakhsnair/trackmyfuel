import { MetricCard } from "@/components/MetricCard";
import { SimpleLineChart } from "@/components/SimpleLineChart";
import { SimpleBarChart } from "@/components/SimpleBarChart";
import { QuickActions } from "@/components/QuickActions";
import { Settings, Bike, Plus, History as HistIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Refuel, computeFullToFullEfficiency, db } from "@/lib/db";
import { useActiveBike } from "@/lib/prefs";

const Index = () => {
  const [activeBike] = useActiveBike()
  const entries = useLiveQuery(async () => db.refuels.orderBy('created_at').reverse().toArray(), [], []) as Refuel[]
  const last = (entries || []).filter(e => !activeBike || e.bike_local_id === activeBike.id)
  const totalDistance = last.length >= 2 ? last[0].odometer_km - last[last.length - 1].odometer_km : 0
  const currentMileage = (() => {
    if (last.length < 2) return null
    const idx = last.findIndex(e => e.full_tank)
    if (idx < 0) return null
    const since = last.slice(0, idx)
    const litres = since.reduce((s, e) => s + (e.litres || 0), 0)
    const distance = last[0].odometer_km - last[idx].odometer_km
    return litres > 0 ? distance / litres : null
  })()
  const f2f = computeFullToFullEfficiency(last)

  // Trends
  function periodStats(period: 'day'|'week'|'month', count: number) {
    const res: { name: string; distance: number; efficiency: number }[] = []
    for (let i = count - 1; i >= 0; i--) {
      const now = new Date()
      let start = new Date(now)
      let end = new Date(now)
      if (period === 'day') {
        start.setDate(now.getDate() - i); start.setHours(0,0,0,0)
        end.setDate(now.getDate() - i + 1); end.setHours(0,0,0,0)
      } else if (period === 'week') {
        const dayIdx = now.getDay()
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - dayIdx - (7 * (i)))
        startOfWeek.setHours(0,0,0,0)
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate()+7)
        start = startOfWeek; end = endOfWeek
      } else { // month
        const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        start = s; end = e
      }
      const w = last.filter(e => e.created_at >= +start && e.created_at < +end)
      const distance = w.length >= 2 ? w[0].odometer_km - w[w.length - 1].odometer_km : 0
      const litres = w.reduce((s, e) => s + (e.litres || 0), 0)
      const efficiency = litres > 0 ? +(distance / litres).toFixed(2) : 0
      const name = period === 'day' ? start.toLocaleDateString(undefined, { weekday: 'short' })
                  : period === 'week' ? `W${i === 0 ? '0' : `-${i}`}`
                  : start.toLocaleDateString(undefined, { month: 'short' })
      res.push({ name, distance: Math.max(0, distance), efficiency })
    }
    return res
  }
  const daily = periodStats('day', 7)
  const weeks = periodStats('week', 4).map(w => ({ name: w.name, value: w.distance }))
  const months = periodStats('month', 3).map(m => ({ name: m.name, value: m.efficiency }))
  const mileageTrendPct = (() => {
    if (daily.length < 2) return 0
    const last7Avg = daily.slice(-7).reduce((s, d) => s + d.efficiency, 0) / 7
    const prev7Avg = daily.slice(0, -7).reduce((s, d) => s + d.efficiency, 0) / Math.max(1, daily.length - 7)
    if (!prev7Avg) return 0
    return Math.round(((last7Avg - prev7Avg) / prev7Avg) * 100)
  })()
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-primary to-primary-glow rounded-lg">
                <Bike className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">TrackMyFuel</h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
            </div>
            <Link to="/profile">
              <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/add-entry">
            <div className="metric-card p-6 hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-primary to-primary-glow rounded-lg group-hover:shadow-lg transition-shadow">
                  <Plus className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Add New Entry</h3>
                  <p className="text-sm text-muted-foreground">Record fuel purchase</p>
                </div>
              </div>
            </div>
          </Link>
          
          <Link to="/history">
            <div className="metric-card p-6 hover:scale-105 transition-transform cursor-pointer group">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-chart-2 to-chart-3 rounded-lg group-hover:shadow-lg transition-shadow">
                  <HistIcon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">View History</h3>
                  <p className="text-sm text-muted-foreground">All fuel entries</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Current Mileage"
            value={currentMileage ? currentMileage.toFixed(1) : '—'}
            unit="km/L"
            trend={{ value: mileageTrendPct, period: "Last 7 days" }}
          />
          
          <MetricCard
            title="Total Distance"
            value={totalDistance}
            unit="km"
          />
          
          <MetricCard
            title="Fuel Efficiency"
            value={f2f.efficiency ? f2f.efficiency.toFixed(1) : '—'}
            unit="km/L"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mileage Trend Chart */}
          <MetricCard
            title="Mileage Trend"
            value=""
            trend={{ value: mileageTrendPct, period: "Last 7 days" }}
            className="lg:col-span-1"
          >
            <div className="space-y-3">
              <SimpleLineChart data={daily.map(d => ({ value: d.efficiency }))} height={100} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </MetricCard>

          {/* Distance Covered Chart */}
          <MetricCard
            title="Distance Covered"
            value=""
            trend={{ value: 0, period: "Last 4 weeks" }}
            className="lg:col-span-1"
          >
            <div className="space-y-3">
              <SimpleBarChart data={weeks} height={100} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </MetricCard>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fuel Efficiency Over Time */}
          <MetricCard
            title="Fuel Efficiency Over Time"
            value=""
            trend={{ value: 0, period: "Last 3 Months" }}
            className="lg:col-span-2"
          >
            <div className="space-y-3">
              <SimpleBarChart data={months} height={120} horizontal />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
              </div>
            </div>
          </MetricCard>

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </main>
    </div>
  );
};

export default Index;
