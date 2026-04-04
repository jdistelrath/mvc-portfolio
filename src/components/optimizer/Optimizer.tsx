import { useState } from 'react'
import { contracts } from '../../data/portfolio'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const TOTAL_FEES = 23799.22
const fmt = (n: number) => '$' + Math.round(n).toLocaleString()
const fmtPts = (n: number) => n.toLocaleString() + ' pts'

function sellProbability(pricePct: number): number {
  const k = 12, x0 = 0.73
  return 1 / (1 + Math.exp(k * (pricePct - x0)))
}

function heatColor(demand: number): string {
  const colors = ['#f0fdf4','#dcfce7','#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d']
  return colors[Math.round(Math.min(10, Math.max(1, demand))) - 1]
}

function heatTextColor(demand: number): string {
  return demand > 6 ? '#14532d' : '#374151'
}

interface Slot {
  contractId: string
  resort: string
  month: string
  monthIdx: number
  demand: number
  rack: number
  listPrice: number
  expectedValue: number
  sellProbability: number
  evPerPoint: number
  ptsNeeded: number
  selected: boolean
}

export default function Optimizer() {
  const [coveragePct, setCoveragePct] = useState(100)
  const [listingPricePct, setListingPricePct] = useState(68)
  const [minPersonalPts, setMinPersonalPts] = useState(8000)
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set())

  const target = TOTAL_FEES * (coveragePct / 100)
  const pricePct = listingPricePct / 100
  const prob = sellProbability(pricePct)

  const totalPts = contracts.reduce((s, c) => s + c.pts, 0)
  const maxRentalPts = Math.max(0, totalPts - minPersonalPts)

  // Generate all slots
  const allSlots: Slot[] = []
  contracts.forEach(c => {
    MONTHS.forEach((m, mi) => {
      const demand = c.seasonal[mi]
      const rack = c.mktLow + (c.mktHigh - c.mktLow) * ((demand - 1) / 9)
      const listPrice = rack * pricePct
      const ev = listPrice * prob
      const evPerPoint = ev / c.pts
      allSlots.push({
        contractId: c.id,
        resort: c.name,
        month: m,
        monthIdx: mi,
        demand,
        rack,
        listPrice,
        expectedValue: ev,
        sellProbability: prob,
        evPerPoint,
        ptsNeeded: c.pts,
        selected: false,
      })
    })
  })

  // Sort by EV per point desc
  const sorted = [...allSlots].sort((a, b) => b.evPerPoint - a.evPerPoint)

  // Greedy selection
  let accRev = 0, accPts = 0
  const usedContracts = new Set<string>()
  const results: Slot[] = sorted.map(sl => {
    const key = `${sl.contractId}-${sl.monthIdx}`
    const isBlocked = blockedSlots.has(key)
    if (
      !isBlocked &&
      accRev < target &&
      accPts + sl.ptsNeeded <= maxRentalPts &&
      !usedContracts.has(sl.contractId)
    ) {
      usedContracts.add(sl.contractId)
      accRev += sl.expectedValue
      accPts += sl.ptsNeeded
      return { ...sl, selected: true }
    }
    return { ...sl, selected: false }
  })

  const selectedSlots = results.filter(s => s.selected)
  const totalExpectedRev = selectedSlots.reduce((s, r) => s + r.expectedValue, 0)
  const totalRentalPts = selectedSlots.reduce((s, r) => s + r.ptsNeeded, 0)
  const personalPts = totalPts - totalRentalPts
  const coverage = target > 0 ? Math.min(200, (totalExpectedRev / target) * 100) : 100
  const gap = target - totalExpectedRev

  const covColor = coverage >= 95 ? 'text-green-700' : coverage >= 70 ? 'text-amber-700' : 'text-red-700'
  const covChip = coverage >= 95 ? 'chip-green' : coverage >= 70 ? 'chip-amber' : 'chip-red'
  const persColor = personalPts > 12000 ? 'text-green-700' : personalPts > 6000 ? 'text-amber-700' : 'text-red-700'

  const toggleBlock = (contractId: string, monthIdx: number) => {
    const key = `${contractId}-${monthIdx}`
    setBlockedSlots(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Rental Optimizer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Maximize rental revenue using the price-to-sell model. Click any heatmap cell to block that week from rental.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Controls */}
        <div className="card">
          <div className="section-label">Optimization controls</div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">Coverage target</label>
                <span className="text-sm font-semibold">{coveragePct}% · {fmt(target)}</span>
              </div>
              <input type="range" min={50} max={150} step={5} value={coveragePct}
                onChange={e => setCoveragePct(Number(e.target.value))}
                className="w-full accent-green-600" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">Listing price (% of rack)</label>
                <span className="text-sm font-semibold">{listingPricePct}% · P(sell) = {Math.round(prob * 100)}%</span>
              </div>
              <input type="range" min={45} max={95} step={1} value={listingPricePct}
                onChange={e => setListingPricePct(Number(e.target.value))}
                className="w-full accent-blue-600" />
              <div className="text-xs text-gray-400 mt-1">
                {listingPricePct < 60 && '⚠ Below sweet spot — consider raising price'}
                {listingPricePct >= 60 && listingPricePct <= 75 && '✓ Near optimal expected value zone (65–70%)'}
                {listingPricePct > 75 && '⚠ Above sweet spot — sell probability drops significantly'}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">Min personal points to preserve</label>
                <span className="text-sm font-semibold">{fmtPts(minPersonalPts)}</span>
              </div>
              <input type="range" min={0} max={20000} step={500} value={minPersonalPts}
                onChange={e => setMinPersonalPts(Number(e.target.value))}
                className="w-full accent-purple-600" />
            </div>
          </div>
        </div>

        {/* Results summary */}
        <div className="card">
          <div className="section-label">Optimization results</div>
          <div className="space-y-2">
            {[
              { label: 'Revenue target', val: fmt(target), color: 'text-gray-900' },
              { label: 'Expected rental revenue', val: fmt(totalExpectedRev), color: covColor },
              { label: 'Coverage achieved', val: `${Math.round(coverage)}%`, color: covColor, chip: covChip },
              { label: 'Sell probability per listing', val: `${Math.round(prob * 100)}%`, color: 'text-blue-700' },
              { label: 'Points to rental', val: fmtPts(totalRentalPts), color: 'text-gray-900' },
              { label: 'Personal points remaining', val: fmtPts(personalPts), color: persColor },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-gray-100 text-sm">
                <span className="text-gray-500">{r.label}</span>
                {r.chip
                  ? <span className={`chip ${r.chip}`}>{r.val}</span>
                  : <span className={`font-semibold ${r.color}`}>{r.val}</span>
                }
              </div>
            ))}
            {gap > 0
              ? <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Gap</span><span className="text-red-600 font-semibold">{fmt(gap)} uncovered</span></div>
              : <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Surplus</span><span className="text-green-600 font-semibold">+{fmt(-gap)}</span></div>
            }
          </div>
          <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-500 leading-relaxed">
            <strong>How it works:</strong> All contract × month combinations are ranked by expected value per point
            (list price × sell probability ÷ points). The optimizer greedily selects the highest-value slots
            until the revenue target is met, subject to your personal point floor.
          </div>
        </div>
      </div>

      {/* Interactive heatmap — click to block */}
      <div className="section-label">Block weeks from rental — click a cell to toggle</div>
      <div className="card mb-6 overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(12, 1fr)', gap: '3px', minWidth: '700px' }}>
          <div />
          {MONTHS.map(m => (
            <div key={m} className="text-center text-xs font-semibold text-gray-500 py-1">{m}</div>
          ))}
          {contracts.map(c => {
            const contractResults = results.filter(r => r.contractId === c.id)
            return (
              <>
                <div key={c.id + '-lbl'} className="flex items-center text-xs text-gray-600 font-medium pr-2">{c.name}</div>
                {c.seasonal.map((d, mi) => {
                  const key = `${c.id}-${mi}`
                  const isBlocked = blockedSlots.has(key)
                  const slotResult = contractResults.find(r => r.monthIdx === mi)
                  const isSelected = slotResult?.selected ?? false
                  const rack = c.mktLow + (c.mktHigh - c.mktLow) * ((d - 1) / 9)
                  const ev = rack * pricePct * prob

                  return (
                    <div key={mi}
                      onClick={() => toggleBlock(c.id, mi)}
                      title={`${c.name} ${MONTHS[mi]}: demand ${d}/10 · EV ${fmt(ev)}\n${isSelected ? '✓ Selected for rental' : isBlocked ? '✗ Blocked' : 'Click to block'}`}
                      className="rounded flex flex-col items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: isBlocked ? '#fef3c7' : isSelected ? '#bbf7d0' : heatColor(d),
                        color: isBlocked ? '#92400e' : isSelected ? '#14532d' : heatTextColor(d),
                        height: '36px',
                        fontSize: '10px',
                        fontWeight: 600,
                        border: isSelected ? '2px solid #16a34a' : isBlocked ? '2px solid #f59e0b' : '2px solid transparent',
                      }}>
                      <span>{d}</span>
                      {isSelected && <span style={{ fontSize: '8px' }}>✓ rent</span>}
                      {isBlocked && <span style={{ fontSize: '8px' }}>blocked</span>}
                    </div>
                  )
                })}
              </>
            )
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-4 h-3 rounded border-2 border-green-600 bg-green-100 inline-block" /> Selected for rental</span>
          <span className="flex items-center gap-1"><span className="w-4 h-3 rounded border-2 border-amber-400 bg-amber-50 inline-block" /> Blocked (personal use)</span>
          <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-green-900 inline-block" /> High demand</span>
          <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-green-100 inline-block" /> Low demand</span>
        </div>
      </div>

      {/* Results table */}
      <div className="section-label">All rental slots — ranked by expected value per point</div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Resort</th>
              <th>Month</th>
              <th className="text-center">Demand</th>
              <th className="text-right">Rack/wk</th>
              <th className="text-right">List price</th>
              <th className="text-right">P(sell)</th>
              <th className="text-right">Expected value</th>
              <th className="text-right">EV/pt</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 30).map((sl, i) => (
              <tr key={i} style={{ background: sl.selected ? '#f0fdf4' : undefined }}>
                <td className="font-medium text-sm">{sl.resort}</td>
                <td>{sl.month}</td>
                <td className="text-center">
                  <span className="w-6 h-6 rounded inline-flex items-center justify-center text-xs font-bold"
                    style={{ background: heatColor(sl.demand), color: heatTextColor(sl.demand) }}>
                    {sl.demand}
                  </span>
                </td>
                <td className="text-right">{fmt(sl.rack)}</td>
                <td className="text-right">{fmt(sl.listPrice)}</td>
                <td className="text-right">{Math.round(sl.sellProbability * 100)}%</td>
                <td className={`text-right font-semibold ${sl.expectedValue > 2000 ? 'text-green-700' : sl.expectedValue > 1000 ? 'text-amber-700' : 'text-gray-500'}`}>
                  {fmt(sl.expectedValue)}
                </td>
                <td className="text-right text-xs">${sl.evPerPoint.toFixed(2)}</td>
                <td>
                  <span className={`chip ${sl.selected ? 'chip-green' : blockedSlots.has(`${sl.contractId}-${sl.monthIdx}`) ? 'chip-amber' : 'chip-gray'}`}>
                    {sl.selected ? '✓ Rent' : blockedSlots.has(`${sl.contractId}-${sl.monthIdx}`) ? 'Blocked' : '—'}
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