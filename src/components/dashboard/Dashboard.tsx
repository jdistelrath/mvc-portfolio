import { useState } from 'react'
import { useAccount, useContracts, useTrustContracts, useLiveBalances, useTotalAvailable, useTotalFees, usePlannedTrips, useYearlyAllocations } from '../../hooks/usePortfolioData'
import type { PlannedTrip } from '../../data/portfolio'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()
const fmtPts = (n: number) => n.toLocaleString() + ' pts'

const alerts = [
  { type: 'danger', title: 'Contract 1348954 expires Dec 31, 2026', body: '1,500 trust points lost if unused. Prioritize before year end.' },
  { type: 'warning', title: '1,156 hold points in 2026 — restricted usage', body: '124 pts (MU*9203*24*B) and 1,032 pts (CV*3259*50*B) cannot be used for all booking types.' },
  { type: 'warning', title: 'Ocean Pointe 2027 set to Occupy — 8,650 pts of value', body: 'Both weeks cost $5,846 in fees. Verify rental market before use year locks.' },
  { type: 'success', title: 'Maui fees dropped 12.8% for 2026', body: 'MOC plumbing project ended — $3,803 vs prior $4,361. One rental week covers the full fee.' },
  { type: 'danger', title: 'Contracts 1673690 & 1753382 have invalid expiry dates', body: 'Contact Marriott to confirm terms on these trust contracts.' },
]

const alertStyles: Record<string, string> = {
  danger: 'bg-red-50 border-red-300',
  warning: 'bg-amber-50 border-amber-300',
  success: 'bg-green-50 border-green-300',
}

const alertTitleStyles: Record<string, string> = {
  danger: 'text-red-800',
  warning: 'text-amber-800',
  success: 'text-green-800',
}

export default function Dashboard() {
  const { data: account } = useAccount()
  const { data: contracts = [] } = useContracts()
  const { data: trustContracts = [] } = useTrustContracts()
  const { data: liveBalances = [] } = useLiveBalances()
  const { data: totalAvailable = 0 } = useTotalAvailable()
  const { data: totalFees = 0 } = useTotalFees()
  const { data: initialTrips = [] } = usePlannedTrips()
  const { data: yearlyAllocations } = useYearlyAllocations()

  const [trips, setTrips] = useState<PlannedTrip[] | null>(null)
  const [editingGuest, setEditingGuest] = useState<string | null>(null)
  const [guestDraft, setGuestDraft] = useState('')

  // Use local state if user has edited, otherwise use fetched data
  const activeTrips = trips ?? initialTrips

  const used2026 = activeTrips.filter(t => t.year === 2026).reduce((s, t) => s + t.pts, 0)

  const startEditGuest = (tripId: string, currentGuest: string) => {
    setEditingGuest(tripId)
    setGuestDraft(currentGuest)
  }

  const saveGuest = (tripId: string) => {
    const base = trips ?? initialTrips
    setTrips(base.map(t => t.id === tripId ? { ...t, guest: guestDraft } : t))
    setEditingGuest(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Portfolio Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          {account?.name ?? ''} · {contracts.length} elected weeks · {trustContracts.length} trust contracts · as of April 2026
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">2026 points available</div>
          <div className="text-xl font-semibold text-gray-900">{fmtPts(totalAvailable)}</div>
          <div className="text-xs text-gray-400 mt-1">4,850 annual · 1,156 hold</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Recurring annual allocation</div>
          <div className="text-xl font-semibold text-gray-900">{fmtPts(yearlyAllocations?.[2026]?.recurringTotal ?? 0)}</div>
          <div className="text-xs text-gray-400 mt-1">Elected + primary trust · excludes legacy</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Confirmed 2026 fees</div>
          <div className="text-xl font-semibold text-gray-900">{fmt(totalFees)}</div>
          <div className="text-xs text-gray-400 mt-1">6 contracts confirmed</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-gray-500 mb-1">Maui rental value</div>
          <div className="text-xl font-semibold text-gray-900">$7,850/wk</div>
          <div className="text-xs text-gray-400 mt-1">RedWeek Apr 2026 · 2BR oceanfront</div>
        </div>
      </div>

      {/* Year allocation pills */}
      <div className="flex gap-3 mb-6">
        {([2026, 2027, 2028] as const).map(yr => {
          const alloc = yearlyAllocations?.[yr]
          if (!alloc) return null
          return (
            <div key={yr} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-sm font-semibold text-gray-700">{yr}</span>
              <span className="text-sm text-gray-900 font-medium">{fmtPts(alloc.recurringTotal)}</span>
              <span className="text-xs text-gray-400">recurring</span>
              {alloc.legacyTrust > 0 && (
                <span className="chip chip-amber text-xs">+{fmtPts(alloc.legacyTrust)} legacy</span>
              )}
              {'note' in alloc && (
                <span className="chip chip-amber text-xs">⚠ Occupy</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Alerts */}
        <div>
          <div className="section-label">Alerts</div>
          {alerts.map((a, i) => (
            <div key={i} className={`alert border ${alertStyles[a.type]}`}>
              <div className="text-sm mt-0.5">{a.type === 'success' ? '✓' : '!'}</div>
              <div>
                <div className={`text-xs font-semibold mb-0.5 ${alertTitleStyles[a.type]}`}>{a.title}</div>
                <div className="text-xs text-gray-600">{a.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 2026 Balance + Trips */}
        <div>
          <div className="section-label">2026 live balance</div>
          <div className="tbl-wrap mb-4">
            <table>
              <thead>
                <tr><th>Source</th><th>Type</th><th className="text-right">Points</th></tr>
              </thead>
              <tbody>
                {liveBalances.map((b, i) => {
                  const contract = contracts.find(c => c.id === b.contractId) ||
                    trustContracts.find(c => c.id === b.contractId)
                  return (
                    <tr key={i}>
                      <td className="text-xs">{contract?.name ?? b.contractId}</td>
                      <td>
                        <span className={`chip ${b.type === 'Hold' ? 'chip-amber' : b.type === 'Trust Annual' ? 'chip-blue' : 'chip-green'}`}>
                          {b.type}
                        </span>
                      </td>
                      <td className="text-right font-medium">{b.pts.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={2} className="font-semibold">Total available</td>
                  <td className="text-right font-semibold">{totalAvailable.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="section-label">2026 planned trips</div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Trip</th><th>Guest</th><th>Month</th><th className="text-right">Points</th><th>Status</th></tr>
              </thead>
              <tbody>
                {activeTrips.filter(t => t.year === 2026).map(t => (
                  <tr key={t.id}>
                    <td className="font-medium text-xs">{t.name}</td>
                    <td className="text-xs">
                      {editingGuest === t.id ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            value={guestDraft}
                            onChange={e => setGuestDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveGuest(t.id); if (e.key === 'Escape') setEditingGuest(null) }}
                            className="border border-blue-300 rounded px-1 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <button onClick={() => saveGuest(t.id)} className="text-green-600 text-xs font-medium">✓</button>
                          <button onClick={() => setEditingGuest(null)} className="text-gray-400 text-xs">✕</button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => startEditGuest(t.id, t.guest)}
                          title="Click to edit guest">
                          {t.guest}
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-gray-500">{t.month}</td>
                    <td className="text-right text-xs">{t.pts.toLocaleString()}</td>
                    <td><span className={`chip ${t.booked ? 'chip-green' : 'chip-gray'}`}>{t.booked ? 'Booked' : 'Planned'}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="font-semibold">Total used</td>
                  <td className="text-right font-semibold">{used2026.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Contracts table */}
      <div className="section-label">All contracts</div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Contract ID</th>
              <th>Resort</th>
              <th>Location</th>
              <th>Floor Plan</th>
              <th className="text-right">Points/yr</th>
              <th className="text-right">2026 Fee</th>
              <th className="text-right">$/point</th>
              <th>2027</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map(c => (
              <tr key={c.id}>
                <td className="font-mono text-xs text-gray-500">{c.id}</td>
                <td className="font-medium">{c.name}</td>
                <td className="text-xs text-gray-500">{c.loc}</td>
                <td className="text-xs text-gray-500">{c.floor}</td>
                <td className="text-right">{c.pts.toLocaleString()}</td>
                <td className="text-right">{c.fee ? fmt(c.fee) : <span className="text-amber-600">TBD</span>}</td>
                <td className="text-right text-xs">{c.fee ? '$' + (c.fee / c.pts).toFixed(3) : '—'}</td>
                <td>
                  <span className={`chip ${c.status2027 === 'OCCUPY' ? 'chip-amber' : 'chip-green'}`}>
                    {c.status2027}
                  </span>
                </td>
              </tr>
            ))}
            {trustContracts.map(t => (
              <tr key={t.id}>
                <td className="font-mono text-xs text-gray-500">{t.id}</td>
                <td className="font-medium">{t.name}</td>
                <td className="text-xs text-gray-500">Flexible</td>
                <td className="text-xs text-gray-500">Trust</td>
                <td className="text-right">{t.pts.toLocaleString()}</td>
                <td className="text-right">{t.fee ? fmt(t.fee) : '—'}</td>
                <td className="text-right text-xs">{t.fee ? '$' + (t.fee / t.pts).toFixed(3) : '—'}</td>
                <td>
                  <span className={`chip ${t.flag === 'expire' ? 'chip-amber' : t.flag === 'warn' ? 'chip-red' : 'chip-green'}`}>
                    {t.flag === 'expire' ? 'Expiring' : t.flag === 'warn' ? 'Verify' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
