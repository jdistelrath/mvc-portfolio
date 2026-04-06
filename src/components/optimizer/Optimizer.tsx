import { useState } from 'react'
import { useContracts } from '../../hooks/usePortfolioData'
import { getYieldPerPoint, getRankedByYield, type MVCResort } from '../../data/resortDatabase'

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

interface ArbitrageRow {
  source: string
  sourceId: string
  sourceLoc: string
  sourcePts: number
  sourceFee: number
  sourceDirectEv: number
  sourceYieldPerPt: number
  target: MVCResort
  targetPtsNeeded: number
  targetRack: number
  targetListPrice: number
  targetEv: number
  targetYieldPerPt: number
  netGain: number
  pointsShortfall: number
  feasible: boolean
  trustTopUp: number
}

export default function Optimizer() {
  const { data: contracts = [] } = useContracts()
  const [mode, setMode] = useState<'standard' | 'arbitrage'>('standard')
  const [arbSeason, setArbSeason] = useState<'low' | 'avg' | 'peak'>('peak')
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

  // ── Arbitrage analysis ──────────────────────────────────────────────────────
  const electedContracts = contracts.filter(c => c.type === 'week')
  const rankedResorts = getRankedByYield(arbSeason)

  // Build full arbitrage table
  const arbitrageRows: ArbitrageRow[] = []
  electedContracts.forEach(src => {
    // Source direct EV = best month's EV at current pricing
    const bestDirectEv = Math.max(
      ...src.seasonal.map(d => {
        const rack = src.mktLow + (src.mktHigh - src.mktLow) * ((d - 1) / 9)
        return rack * pricePct * prob
      })
    )
    const sourceYieldPerPt = bestDirectEv / src.pts

    rankedResorts.forEach(tgt => {
      const rateKey = arbSeason
      const ptsKey = arbSeason === 'avg' ? 'mid' : arbSeason
      const targetPtsNeeded = tgt.pointCosts[ptsKey]
      const targetRack = tgt.marketRates[rateKey]
      const targetListPrice = targetRack * pricePct
      const targetEv = targetListPrice * prob
      const targetYieldPerPt = getYieldPerPoint(tgt, arbSeason)
      const shortfall = Math.max(0, targetPtsNeeded - src.pts)

      arbitrageRows.push({
        source: src.name,
        sourceId: src.id,
        sourceLoc: src.loc,
        sourcePts: src.pts,
        sourceFee: src.fee ?? 0,
        sourceDirectEv: bestDirectEv,
        sourceYieldPerPt,
        target: tgt,
        targetPtsNeeded,
        targetRack,
        targetListPrice,
        targetEv,
        targetYieldPerPt,
        netGain: targetEv - bestDirectEv,
        pointsShortfall: shortfall,
        feasible: shortfall === 0,
        trustTopUp: shortfall,
      })
    })
  })
  const sortedArbitrage = [...arbitrageRows].sort((a, b) => b.netGain - a.netGain)

  // Per-contract top 3 arbitrage targets
  const top3ByContract = new Map<string, ArbitrageRow[]>()
  electedContracts.forEach(src => {
    const rows = sortedArbitrage
      .filter(r => r.sourceId === src.id && r.netGain > 0)
      .slice(0, 3)
    top3ByContract.set(src.id, rows)
  })

  const feasibleGains = sortedArbitrage.filter(r => r.feasible && r.netGain > 0)
  const bestGain = feasibleGains[0]
  const totalArbitrageGain = feasibleGains.reduce((s, r) => s + r.netGain, 0)

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Rental Optimizer</h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'standard'
                ? 'Maximize rental revenue using the price-to-sell model. Click any heatmap cell to block that week from rental.'
                : 'Convert elected weeks to points, then book higher-value properties for maximum rental spread.'}
            </p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setMode('standard')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'standard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Standard Mode
            </button>
            <button
              onClick={() => setMode('arbitrage')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'arbitrage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Arbitrage Mode
            </button>
          </div>
        </div>
      </div>

      {mode === 'arbitrage' ? (
      <>
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          <div className="card">
            <div className="section-label">Profitable plays</div>
            <div className="text-2xl font-bold text-gray-900">{feasibleGains.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              Feasible trades with positive net gain at {arbSeason} season
            </div>
          </div>
          <div className="card">
            <div className="section-label">Best single arbitrage</div>
            <div className={`text-2xl font-bold ${bestGain ? 'text-green-700' : 'text-gray-500'}`}>
              {bestGain ? fmt(bestGain.netGain) : '--'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {bestGain
                ? `${bestGain.source} \u2192 ${bestGain.target.name}`
                : 'No profitable plays at this season'}
            </div>
          </div>
          <div className="card">
            <div className="section-label">Total arbitrage upside</div>
            <div className={`text-2xl font-bold ${totalArbitrageGain > 0 ? 'text-green-700' : 'text-gray-500'}`}>
              {fmt(totalArbitrageGain)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Sum of all feasible net gains</div>
          </div>
        </div>

        {/* Controls */}
        <div className="card mb-6">
          <div className="section-label">Arbitrage assumptions</div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">Listing price (% of rack)</label>
                <span className="text-sm font-semibold">{listingPricePct}% &middot; P(sell) = {Math.round(prob * 100)}%</span>
              </div>
              <input type="range" min={45} max={95} step={1} value={listingPricePct}
                onChange={e => setListingPricePct(Number(e.target.value))}
                className="w-full accent-blue-600" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">Booking season</label>
                <span className="text-sm font-semibold capitalize">{arbSeason}</span>
              </div>
              <div className="flex gap-1 mt-1">
                {(['low', 'avg', 'peak'] as const).map(s => (
                  <button key={s} onClick={() => setArbSeason(s)}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      arbSeason === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {s === 'avg' ? 'Mid' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-500 leading-relaxed">
              <strong>How it works:</strong> Elect your week &rarr; receive its point value &rarr; book a
              higher-yield resort at the selected season &rarr; rent that booking using the price-to-sell model.
              Net gain = target EV &minus; source direct rental EV.
            </div>
          </div>
        </div>

        {/* Per-contract top 3 */}
        <div className="section-label mb-2">Top 3 arbitrage targets per elected week</div>
        <div className="grid grid-cols-1 gap-4 mb-6">
          {electedContracts.map(src => {
            const rows = top3ByContract.get(src.id) || []
            const bestDirectEv = Math.max(
              ...src.seasonal.map(d => {
                const rack = src.mktLow + (src.mktHigh - src.mktLow) * ((d - 1) / 9)
                return rack * pricePct * prob
              })
            )
            return (
              <div key={src.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-sm text-gray-900">{src.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{src.loc} &middot; {fmtPts(src.pts)} &middot; Direct EV: {fmt(bestDirectEv)}</span>
                  </div>
                  <span className="text-xs text-gray-400">{src.id}</span>
                </div>
                {rows.length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No profitable arbitrage at {arbSeason} season pricing</div>
                ) : (
                  <div className="space-y-2">
                    {rows.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg"
                        style={{ background: r.feasible ? '#f0fdf4' : '#fffbeb' }}>
                        <span className="text-lg font-bold text-gray-300 w-6">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.target.name}</span>
                            <span className="text-xs text-gray-400">{r.target.location}</span>
                          </div>
                          <div className="flex gap-4 mt-0.5 text-xs text-gray-500">
                            <span>{fmtPts(r.targetPtsNeeded)} needed</span>
                            <span>Rack: {fmt(r.targetRack)}</span>
                            <span>List: {fmt(r.targetListPrice)}</span>
                            <span>EV: <strong className="text-gray-700">{fmt(r.targetEv)}</strong></span>
                            <span>$/pt: <strong>{r.targetYieldPerPt.toFixed(2)}</strong></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-sm ${r.netGain > 0 ? 'text-green-700' : 'text-red-600'}`}>
                            +{fmt(r.netGain)}
                          </div>
                          {r.feasible
                            ? <span className="chip chip-green text-[10px]">Feasible</span>
                            : <span className="chip chip-amber text-[10px]">+{fmtPts(r.trustTopUp)} trust</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Full yield ranking table */}
        <div className="section-label">All resorts by $/pt yield &mdash; {arbSeason} season</div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Resort</th>
                <th>Region</th>
                <th className="text-right">Pts ({arbSeason === 'avg' ? 'mid' : arbSeason})</th>
                <th className="text-right">Rack rate</th>
                <th className="text-right">List @ {listingPricePct}%</th>
                <th className="text-right">EV</th>
                <th className="text-right">$/pt yield</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rankedResorts.map((r, i) => {
                const ptsKey = arbSeason === 'avg' ? 'mid' : arbSeason
                const pts = r.pointCosts[ptsKey]
                const rack = r.marketRates[arbSeason]
                const listPrice = rack * pricePct
                const ev = listPrice * prob
                const yld = getYieldPerPoint(r, arbSeason)
                return (
                  <tr key={r.id} style={{ background: i < 5 ? '#f0fdf4' : undefined }}>
                    <td className="font-medium text-sm">
                      <div>{r.name}</div>
                      <div className="text-xs text-gray-400">{r.location}</div>
                    </td>
                    <td>
                      <span className={`chip ${
                        r.region === 'hawaii' ? 'chip-green' :
                        r.region === 'international' ? 'chip-blue' :
                        r.region === 'california' ? 'chip-amber' :
                        'chip-gray'
                      }`} style={{ textTransform: 'capitalize', fontSize: '10px' }}>
                        {r.region}
                      </span>
                    </td>
                    <td className="text-right">{fmtPts(pts)}</td>
                    <td className="text-right">{fmt(rack)}</td>
                    <td className="text-right">{fmt(listPrice)}</td>
                    <td className={`text-right font-semibold ${ev > 3000 ? 'text-green-700' : ev > 1500 ? 'text-amber-700' : 'text-gray-500'}`}>
                      {fmt(ev)}
                    </td>
                    <td className={`text-right font-bold ${yld > 1.5 ? 'text-green-700' : yld > 1.0 ? 'text-amber-700' : 'text-gray-500'}`}>
                      ${yld.toFixed(2)}
                    </td>
                    <td className="text-xs text-gray-400 max-w-[200px] truncate" title={r.notes}>{r.notes}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Full arbitrage table */}
        <div className="section-label mt-6">Full arbitrage matrix &mdash; all source &times; target combinations</div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Source contract</th>
                <th className="text-right">Source pts</th>
                <th>Target booking</th>
                <th className="text-right">Pts needed</th>
                <th className="text-right">Rack rate</th>
                <th className="text-right">List @ {listingPricePct}%</th>
                <th className="text-right">Expected value</th>
                <th className="text-right">Direct EV</th>
                <th className="text-right">Net gain</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedArbitrage.slice(0, 50).map((row, i) => (
                <tr key={i} style={{
                  background: row.feasible && row.netGain > 0 ? '#f0fdf4' : undefined,
                  opacity: row.feasible ? 1 : 0.55,
                }}>
                  <td className="font-medium text-sm">
                    <div>{row.source}</div>
                    <div className="text-xs text-gray-400">{row.sourceLoc}</div>
                  </td>
                  <td className="text-right">{fmtPts(row.sourcePts)}</td>
                  <td className="font-medium text-sm">
                    <div>{row.target.name}</div>
                    <div className="text-xs text-gray-400">{row.target.location}</div>
                  </td>
                  <td className="text-right">{fmtPts(row.targetPtsNeeded)}</td>
                  <td className="text-right">{fmt(row.targetRack)}</td>
                  <td className="text-right">{fmt(row.targetListPrice)}</td>
                  <td className={`text-right font-semibold ${row.targetEv > 3000 ? 'text-green-700' : row.targetEv > 1500 ? 'text-amber-700' : 'text-gray-500'}`}>
                    {fmt(row.targetEv)}
                  </td>
                  <td className="text-right text-gray-500">{fmt(row.sourceDirectEv)}</td>
                  <td className={`text-right font-semibold ${row.netGain > 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {row.netGain > 0 ? '+' : ''}{fmt(row.netGain)}
                  </td>
                  <td>
                    {!row.feasible
                      ? <span className="chip chip-amber">{fmtPts(row.trustTopUp)} trust</span>
                      : row.netGain > 0
                        ? <span className="chip chip-green">Feasible</span>
                        : <span className="chip chip-red">Loss</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
      ) : (
      <>
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Controls */}
        <div className="card">
          <div className="section-label">Optimization controls</div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">Coverage target</label>
                <span className="text-sm font-semibold">{coveragePct}% &middot; {fmt(target)}</span>
              </div>
              <input type="range" min={50} max={150} step={5} value={coveragePct}
                onChange={e => setCoveragePct(Number(e.target.value))}
                className="w-full accent-green-600" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-500">Listing price (% of rack)</label>
                <span className="text-sm font-semibold">{listingPricePct}% &middot; P(sell) = {Math.round(prob * 100)}%</span>
              </div>
              <input type="range" min={45} max={95} step={1} value={listingPricePct}
                onChange={e => setListingPricePct(Number(e.target.value))}
                className="w-full accent-blue-600" />
              <div className="text-xs text-gray-400 mt-1">
                {listingPricePct < 60 && '\u26A0 Below sweet spot \u2014 consider raising price'}
                {listingPricePct >= 60 && listingPricePct <= 75 && '\u2713 Near optimal expected value zone (65\u201370%)'}
                {listingPricePct > 75 && '\u26A0 Above sweet spot \u2014 sell probability drops significantly'}
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
            <strong>How it works:</strong> All contract &times; month combinations are ranked by expected value per point
            (list price &times; sell probability &divide; points). The optimizer greedily selects the highest-value slots
            until the revenue target is met, subject to your personal point floor.
          </div>
        </div>
      </div>

      {/* Interactive heatmap — click to block */}
      <div className="section-label">Block weeks from rental &mdash; click a cell to toggle</div>
      <div className="card mb-6 overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(12, 1fr)', gap: '3px', minWidth: '700px' }}>
          <div />
          {MONTHS.map(m => (
            <div key={m} className="text-center text-xs font-semibold text-gray-500 py-1">{m}</div>
          ))}
          {contracts.map(c => {
            const contractResults = results.filter(r => r.contractId === c.id)
            return (
              <div key={c.id} className="contents">
                <div className="flex items-center text-xs text-gray-600 font-medium pr-2">{c.name}</div>
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
                      title={`${c.name} ${MONTHS[mi]}: demand ${d}/10 \xB7 EV ${fmt(ev)}\n${isSelected ? '\u2713 Selected for rental' : isBlocked ? '\u2717 Blocked' : 'Click to block'}`}
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
                      {isSelected && <span style={{ fontSize: '8px' }}>{'\u2713'} rent</span>}
                      {isBlocked && <span style={{ fontSize: '8px' }}>blocked</span>}
                    </div>
                  )
                })}
              </div>
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
      <div className="section-label">All rental slots &mdash; ranked by expected value per point</div>
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
                    {sl.selected ? '\u2713 Rent' : blockedSlots.has(`${sl.contractId}-${sl.monthIdx}`) ? 'Blocked' : '\u2014'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  )
}
