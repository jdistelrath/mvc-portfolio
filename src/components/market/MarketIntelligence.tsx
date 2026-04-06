import { useState, useRef, useEffect, useMemo } from 'react'
import { useContracts, useResorts } from '../../hooks/usePortfolioData'
import { getYieldPerPoint, type MVCResort } from '../../data/resortDatabase'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

type Region = MVCResort['region']

// Derive unique regions and states from the database
const ALL_REGIONS: { value: Region; label: string }[] = [
  { value: 'hawaii', label: 'Hawaii' },
  { value: 'florida', label: 'Florida' },
  { value: 'arizona', label: 'Arizona' },
  { value: 'california', label: 'California' },
  { value: 'nevada', label: 'Nevada' },
  { value: 'colorado', label: 'Colorado' },
  { value: 'southeast', label: 'Southeast' },
  { value: 'northeast', label: 'Northeast' },
  { value: 'international', label: 'International' },
]

function extractState(location: string): string {
  const parts = location.split(',').map(s => s.trim())
  return parts[parts.length - 1]
}

function sellProbability(pricePct: number): number {
  const k = 12, x0 = 0.73
  return 1 / (1 + Math.exp(k * (pricePct - x0)))
}

function heatColor(demand: number): string {
  const colors = [
    '#f0fdf4','#dcfce7','#bbf7d0','#86efac',
    '#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d',
  ]
  return colors[Math.round(Math.min(10, Math.max(1, demand))) - 1]
}

function heatTextColor(demand: number): string {
  return demand > 6 ? '#14532d' : '#374151'
}

function findOptimalPricePct(rackRate: number): number {
  let bestPct = 0.65, bestEv = 0
  for (let p = 0.3; p <= 1.0; p += 0.005) {
    const ev = rackRate * p * sellProbability(p)
    if (ev > bestEv) { bestEv = ev; bestPct = p }
  }
  return bestPct
}

function getCompUrls(resortName: string) {
  const q = encodeURIComponent(resortName + ' Marriott')
  return [
    { platform: 'RedWeek', url: `https://www.redweek.com/search?search=${encodeURIComponent(resortName)}` },
    { platform: 'VRBO', url: `https://www.vrbo.com/search?destination=${q}&startDate=${MONTHS[new Date().getMonth()]}` },
    { platform: 'Airbnb', url: `https://www.airbnb.com/s/${q}/homes` },
  ]
}

function toggleSet<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set)
  next.has(item) ? next.delete(item) : next.add(item)
  return next
}

type SortKey = 'name' | 'location' | 'low' | 'avg' | 'peak' | 'pts' | 'yield' | 'source'
type SortDir = 'asc' | 'desc'

export default function MarketIntelligence() {
  const { data: resorts = [] } = useResorts()
  const { data: contracts = [] } = useContracts()

  const ALL_STATES = useMemo(() =>
    [...new Set(resorts.map(r => extractState(r.location)))].sort(),
  [resorts])

  const OWNED_NAMES = useMemo(() =>
    new Set(contracts.map(c => c.name)),
  [contracts])

  const [selectedRegions, setSelectedRegions] = useState<Set<Region>>(new Set())
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set())
  const [yieldSeason, setYieldSeason] = useState<'low' | 'avg' | 'peak'>('peak')
  const [rack, setRack] = useState(8500)
  const [listPrice, setListPrice] = useState(6000)
  const [curveResort, setCurveResort] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('yield')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [compsResort, setCompsResort] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const pricePct = rack > 0 ? listPrice / rack : 0
  const prob = sellProbability(pricePct)
  const ev = listPrice * prob
  const optimalPct = findOptimalPricePct(rack)
  const optimalEv = rack * optimalPct * sellProbability(optimalPct)

  const hasFilters = selectedRegions.size > 0 || selectedStates.size > 0

  // Global filtered resorts — used by heatmap, yield table, and market table
  const filteredResorts = useMemo(() => {
    if (!hasFilters) return []
    return resorts.filter(r => {
      const regionMatch = selectedRegions.size === 0 || selectedRegions.has(r.region)
      const stateMatch = selectedStates.size === 0 || selectedStates.has(extractState(r.location))
      return regionMatch && stateMatch
    })
  }, [selectedRegions, selectedStates, hasFilters])

  // States available given current region selection (for smart filtering)
  const availableStates = useMemo(() => {
    const pool = selectedRegions.size > 0
      ? resorts.filter(r => selectedRegions.has(r.region))
      : resorts
    return [...new Set(pool.map(r => extractState(r.location)))].sort()
  }, [selectedRegions])

  // Sorted + filtered market table
  const marketTableData = useMemo(() => {
    let data = [...filteredResorts]
    if (tableSearch) {
      const q = tableSearch.toLowerCase()
      data = data.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q)
      )
    }
    const getSortVal = (r: MVCResort): number | string => {
      switch (sortKey) {
        case 'name': return r.name.toLowerCase()
        case 'location': return r.location.toLowerCase()
        case 'low': return r.marketRates.low
        case 'avg': return r.marketRates.avg
        case 'peak': return r.marketRates.peak
        case 'pts': return r.pointCosts.peak
        case 'yield': return getYieldPerPoint(r, 'peak')
        case 'source': return r.marketRates.source.toLowerCase()
        default: return 0
      }
    }
    data.sort((a, b) => {
      const va = getSortVal(a), vb = getSortVal(b)
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'desc' ? -cmp : cmp
    })
    return data
  }, [filteredResorts, tableSearch, sortKey, sortDir])

  // Yield-ranked filtered resorts
  const yieldRanked = useMemo(() => {
    return [...filteredResorts].sort((a, b) =>
      getYieldPerPoint(b, yieldSeason) - getYieldPerPoint(a, yieldSeason)
    )
  }, [filteredResorts, yieldSeason])

  useEffect(() => {
    if (curveResort) {
      const r = resorts.find(r => r.id === curveResort)
      if (r) {
        setRack(r.marketRates.peak)
        setListPrice(Math.round(r.marketRates.peak * 0.68))
      }
    }
  }, [curveResort])

  useEffect(() => { drawCurve() }, [rack, listPrice])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === 'desc' ? ' \u25BC' : ' \u25B2') : ''

  function drawCurve() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width, H = canvas.height
    const pad = { top: 20, right: 60, bottom: 40, left: 70 }
    const chartW = W - pad.left - pad.right
    const chartH = H - pad.top - pad.bottom
    const steps = 100

    ctx.clearRect(0, 0, W, H)

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (chartH * i) / 5
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
    }

    for (let i = 0; i < steps; i++) {
      const x = (i + 1) / steps
      const evVal = rack * x * sellProbability(x)
      const barH = (evVal / rack) * chartH
      const barX = pad.left + (i / steps) * chartW
      const barW = chartW / steps
      const isSelected = Math.abs(x - pricePct) < 0.01
      ctx.fillStyle = isSelected ? '#16a34a' : 'rgba(34,197,94,0.25)'
      ctx.fillRect(barX, pad.top + chartH - barH, barW - 1, barH)
    }

    ctx.strokeStyle = '#378ADD'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const x = i / steps
      const p = sellProbability(x)
      const px = pad.left + x * chartW
      const py = pad.top + chartH - p * chartH
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()

    const markerX = pad.left + pricePct * chartW
    ctx.strokeStyle = '#16a34a'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(markerX, pad.top); ctx.lineTo(markerX, pad.top + chartH); ctx.stroke()
    ctx.setLineDash([])

    const optX = pad.left + optimalPct * chartW
    ctx.strokeStyle = '#7c3aed'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])
    ctx.beginPath(); ctx.moveTo(optX, pad.top); ctx.lineTo(optX, pad.top + chartH); ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#7c3aed'
    ctx.font = 'bold 10px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(`Optimal ${Math.round(optimalPct * 100)}%`, optX, pad.top - 4)
    ctx.fillText(fmt(optimalEv), optX, pad.top + 10)

    ctx.fillStyle = '#6b7280'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'
    for (let p = 0; p <= 100; p += 20) {
      const x = pad.left + (p / 100) * chartW
      ctx.fillText(p + '%', x, pad.top + chartH + 16)
    }

    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const val = (rack * i) / 5
      const y = pad.top + chartH - (chartH * i) / 5
      ctx.fillText(fmt(val), pad.left - 6, y + 3)
    }

    ctx.textAlign = 'left'
    for (let i = 0; i <= 5; i++) {
      const val = (100 * i) / 5
      const y = pad.top + chartH - (chartH * i) / 5
      ctx.fillText(Math.round(val) + '%', pad.left + chartW + 6, y + 3)
    }

    ctx.save()
    ctx.translate(14, pad.top + chartH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#9ca3af'
    ctx.font = '10px system-ui'
    ctx.fillText('Expected Value ($)', 0, 0)
    ctx.restore()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#9ca3af'
    ctx.fillText('% of Rack Rate', pad.left + chartW / 2, H - 2)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Market Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seasonal demand, yield rankings, and rental pricing across {resorts.length} MVC resorts. Select regions or states below to explore.
        </p>
      </div>

      {/* ── Global Filters ────────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Region</div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_REGIONS.map(r => (
                <button key={r.value} onClick={() => setSelectedRegions(prev => toggleSet(prev, r.value))}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedRegions.has(r.value)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {r.label}
                  {selectedRegions.has(r.value) && (
                    <span className="ml-1 opacity-75">({resorts.filter(
                      re => re.region === r.value
                    ).length})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">State / Location</div>
            <div className="flex flex-wrap gap-1.5">
              {(selectedRegions.size > 0 ? availableStates : ALL_STATES).map(st => (
                <button key={st} onClick={() => setSelectedStates(prev => toggleSet(prev, st))}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedStates.has(st)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {st}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pt-5">
            {hasFilters && (
              <button onClick={() => { setSelectedRegions(new Set()); setSelectedStates(new Set()) }}
                className="px-3 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap">
                Clear all
              </button>
            )}
            <div className="text-xs text-gray-400 whitespace-nowrap">
              {hasFilters ? `${filteredResorts.length} resorts` : 'Select to filter'}
            </div>
          </div>
        </div>
      </div>

      {!hasFilters ? (
        <div className="card text-center py-12 mb-6">
          <div className="text-gray-400 text-sm">Select one or more regions or states above to view resort data.</div>
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => setSelectedRegions(new Set(['hawaii'] as Region[]))}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
              Hawaii
            </button>
            <button onClick={() => setSelectedRegions(new Set(['florida'] as Region[]))}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              Florida
            </button>
            <button onClick={() => setSelectedRegions(new Set(ALL_REGIONS.map(r => r.value)))}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              Show all
            </button>
          </div>
        </div>
      ) : (
      <>
        {/* ── 1. Heatmap ───────────────────────────────────────────────────────── */}
        <div className="section-label">Seasonal demand heatmap &mdash; {filteredResorts.length} resorts</div>
        <div className="card mb-6 overflow-x-auto">
          <div style={{ display: 'grid', gridTemplateColumns: '220px repeat(12, 1fr)', gap: '3px', minWidth: '800px' }}>
            <div />
            {MONTHS.map(m => (
              <div key={m} className="text-center text-xs font-semibold text-gray-500 py-1">{m}</div>
            ))}
            {filteredResorts.map(r => (
              <div key={r.id} className="contents">
                <div className="flex items-center text-xs text-gray-600 font-medium pr-2 truncate" title={`${r.name} \u2014 ${r.location}`}>
                  {r.name}
                </div>
                {r.demandByMonth.map((d, mi) => {
                  const rate = r.marketRates.low + (r.marketRates.peak - r.marketRates.low) * ((d - 1) / 9)
                  return (
                    <div key={mi}
                      title={`${r.name} ${MONTHS[mi]}: demand ${d}/10 \xB7 est. ${fmt(rate)}/wk`}
                      className="rounded flex items-center justify-center cursor-default hover:opacity-80 transition-opacity"
                      style={{ background: heatColor(d), color: heatTextColor(d), height: '28px', fontSize: '10px', fontWeight: 600 }}>
                      {d}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
            <span>Demand scale:</span>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="w-5 h-3.5 rounded-sm border border-gray-200"
                style={{ background: heatColor(i + 1) }} />
            ))}
            <span>Low &rarr; Peak</span>
          </div>
        </div>

        {/* ── 2. Yield Rankings ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <div className="section-label" style={{ margin: 0 }}>Yield rankings &mdash; $/point by season</div>
          <div className="flex gap-1">
            {(['low', 'avg', 'peak'] as const).map(s => (
              <button key={s} onClick={() => setYieldSeason(s)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  yieldSeason === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s === 'avg' ? 'Mid' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="tbl-wrap mb-6">
          <table>
            <thead>
              <tr>
                <th>Resort</th>
                <th>Region</th>
                <th className="text-right">Low $/pt</th>
                <th className="text-right">Avg $/pt</th>
                <th className="text-right">Peak $/pt</th>
                <th>Best Season</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {yieldRanked.map(r => {
                const yLow = getYieldPerPoint(r, 'low')
                const yAvg = getYieldPerPoint(r, 'avg')
                const yPeak = getYieldPerPoint(r, 'peak')
                const active = yieldSeason === 'low' ? yLow : yieldSeason === 'avg' ? yAvg : yPeak
                const rowBg = active >= 1.0 ? '#f0fdf4' : active >= 0.75 ? '#fffbeb' : undefined
                const best = yLow >= yAvg && yLow >= yPeak ? 'Low' : yAvg >= yPeak ? 'Mid' : 'Peak'
                return (
                  <tr key={r.id} style={{ background: rowBg }}>
                    <td className="font-medium text-sm">
                      <div>{r.name}</div>
                      <div className="text-xs text-gray-400">{r.location}</div>
                    </td>
                    <td>
                      <span className={`chip ${
                        r.region === 'hawaii' ? 'chip-green' :
                        r.region === 'international' ? 'chip-blue' :
                        r.region === 'california' || r.region === 'nevada' || r.region === 'colorado' ? 'chip-amber' :
                        'chip-gray'
                      }`} style={{ textTransform: 'capitalize', fontSize: '10px' }}>
                        {r.region}
                      </span>
                    </td>
                    <td className={`text-right font-semibold ${yLow >= 1.0 ? 'text-green-700' : yLow >= 0.75 ? 'text-amber-700' : 'text-gray-500'}`}>
                      ${yLow.toFixed(2)}
                    </td>
                    <td className={`text-right font-semibold ${yAvg >= 1.0 ? 'text-green-700' : yAvg >= 0.75 ? 'text-amber-700' : 'text-gray-500'}`}>
                      ${yAvg.toFixed(2)}
                    </td>
                    <td className={`text-right font-semibold ${yPeak >= 1.0 ? 'text-green-700' : yPeak >= 0.75 ? 'text-amber-700' : 'text-gray-500'}`}>
                      ${yPeak.toFixed(2)}
                    </td>
                    <td className="text-xs">{best}</td>
                    <td className="text-xs text-gray-400 max-w-[220px] truncate" title={r.notes}>{r.notes}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── 3. Market Data Table ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <div className="section-label" style={{ margin: 0 }}>Market data &mdash; {filteredResorts.length} resorts</div>
          <input type="text" placeholder="Search within results..." value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm w-56" />
        </div>
        <div className="tbl-wrap mb-6">
          <table>
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                  Resort{sortIcon('name')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => handleSort('location')}>
                  Location{sortIcon('location')}
                </th>
                <th className="text-right cursor-pointer select-none" onClick={() => handleSort('low')}>
                  Low/wk{sortIcon('low')}
                </th>
                <th className="text-right cursor-pointer select-none" onClick={() => handleSort('avg')}>
                  Avg/wk{sortIcon('avg')}
                </th>
                <th className="text-right cursor-pointer select-none" onClick={() => handleSort('peak')}>
                  Peak/wk{sortIcon('peak')}
                </th>
                <th className="text-right cursor-pointer select-none" onClick={() => handleSort('pts')}>
                  Pts (peak){sortIcon('pts')}
                </th>
                <th className="text-right cursor-pointer select-none" onClick={() => handleSort('yield')}>
                  $/pt yield{sortIcon('yield')}
                </th>
                <th className="cursor-pointer select-none" onClick={() => handleSort('source')}>
                  Source{sortIcon('source')}
                </th>
                <th>Comps</th>
              </tr>
            </thead>
            <tbody>
              {marketTableData.map(r => {
                const yld = getYieldPerPoint(r, 'peak')
                const isOwned = OWNED_NAMES.has(r.name) ||
                  (r.name === 'Canyon Villas' && (OWNED_NAMES.has('Canyon Villas A') || OWNED_NAMES.has('Canyon Villas B'))) ||
                  (r.name === 'Ocean Pointe (Oceanfront)' && (OWNED_NAMES.has('Ocean Pointe A') || OWNED_NAMES.has('Ocean Pointe B'))) ||
                  (r.name.includes('Maui Ocean Club') && OWNED_NAMES.has('Maui Ocean Club'))
                return (
                  <tr key={r.id}>
                    <td className="font-medium text-sm">{r.name}</td>
                    <td className="text-xs text-gray-500">{r.location}</td>
                    <td className="text-right">{fmt(r.marketRates.low)}</td>
                    <td className="text-right">{fmt(r.marketRates.avg)}</td>
                    <td className="text-right font-medium">{fmt(r.marketRates.peak)}</td>
                    <td className="text-right text-xs">{r.pointCosts.peak.toLocaleString()}</td>
                    <td className={`text-right font-bold ${yld >= 1.0 ? 'text-green-700' : yld >= 0.75 ? 'text-amber-700' : 'text-gray-500'}`}>
                      ${yld.toFixed(2)}
                    </td>
                    <td className="text-xs text-gray-400 max-w-[180px] truncate" title={r.marketRates.source}>
                      {r.marketRates.source}
                    </td>
                    <td>
                      {isOwned ? (
                        <button onClick={() => setCompsResort(r.name)}
                          className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap">
                          Fetch Comps
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">&mdash;</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>
      )}

      {/* ── Price-to-sell curve (always visible) ─────────────────────────────── */}
      <div className="section-label">Price-to-sell probability model</div>
      <div className="card mb-6">
        <p className="text-sm text-gray-500 mb-4">
          Expected revenue peaks at <strong>65&ndash;70% of rack rate</strong> &mdash; below that you leave money on the table, above that sell probability drops sharply.
        </p>
        <div className="flex gap-4 items-end mb-4 flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Resort</label>
            <select value={curveResort} onChange={e => setCurveResort(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-sm w-56">
              <option value="">Custom</option>
              {resorts.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Rack rate/wk</label>
            <input type="number" value={rack} onChange={e => { setRack(Number(e.target.value)); setCurveResort('') }}
              className="border border-gray-200 rounded px-2 py-1 text-sm w-28" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Your listing price</label>
            <input type="number" value={listPrice} onChange={e => setListPrice(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 text-sm w-28" />
          </div>
          <div className="pb-1">
            <div className="text-xs text-gray-500">At {Math.round(pricePct * 100)}% of rack</div>
            <div className="text-sm font-semibold">
              P(sell) = <span className="text-blue-700">{Math.round(prob * 100)}%</span>
              {' \xB7 '}EV = <span className="text-green-700">{fmt(ev)}</span>
              {' \xB7 '}Optimal = <span className="text-purple-700">{fmt(optimalEv)} @ {Math.round(optimalPct * 100)}%</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-gray-400 mb-2">
          <span className="flex items-center gap-1"><span className="w-4 h-2 rounded bg-green-400 inline-block" /> Expected value (left axis)</span>
          <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-400 inline-block" /> Sell probability (right axis)</span>
          <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-green-600 inline-block" /> Your price</span>
          <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-purple-600 inline-block" style={{ borderStyle: 'dashed' }} /> Optimal price</span>
        </div>
        <canvas ref={canvasRef} width={800} height={280} className="w-full" />
      </div>

      {/* ── Comps Modal ───────────────────────────────────────────────────────── */}
      {compsResort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Live Comps: {compsResort}</h3>
              <button onClick={() => setCompsResort(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Click each link to open the search in a new tab. Compare current listings to validate our pricing model.
            </p>
            <div className="space-y-3">
              {getCompUrls(compsResort).map(c => (
                <a key={c.platform} href={c.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{c.platform}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[350px]">{c.url}</div>
                  </div>
                  <span className="text-blue-600 text-sm font-medium group-hover:underline">Open &rarr;</span>
                </a>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
              <strong>Tip:</strong> Look for 2BR units in {MONTHS[new Date().getMonth()]} &ndash; {MONTHS[(new Date().getMonth() + 2) % 12]}.
              Compare to our model: rack = {fmt(resorts.find(r => r.name === compsResort)?.marketRates.peak ?? 0)},
              list @ 68% = {fmt((resorts.find(r => r.name === compsResort)?.marketRates.peak ?? 0) * 0.68)}.
            </div>
            <button onClick={() => setCompsResort(null)}
              className="mt-4 w-full py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
