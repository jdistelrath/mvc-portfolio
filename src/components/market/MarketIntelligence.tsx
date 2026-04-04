import { useState, useRef, useEffect } from 'react'
import { contracts } from '../../data/portfolio'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

function sellProbability(pricePct: number): number {
  const k = 12, x0 = 0.73
  return 1 / (1 + Math.exp(k * (pricePct - x0)))
}

function heatColor(demand: number): string {
  const colors = [
    '#f0fdf4','#dcfce7','#bbf7d0','#86efac',
    '#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d'
  ]
  return colors[Math.round(Math.min(10, Math.max(1, demand))) - 1]
}

function heatTextColor(demand: number): string {
  return demand > 6 ? '#14532d' : '#374151'
}

export default function MarketIntelligence() {
  const [rack, setRack] = useState(8500)
  const [listPrice, setListPrice] = useState(6000)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const pricePct = listPrice / rack
  const prob = sellProbability(pricePct)
  const ev = listPrice * prob

  useEffect(() => {
    drawCurve()
  }, [rack, listPrice])

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

    // Grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (chartH * i) / 5
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
    }

    // EV bars
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

    // Sell probability line
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

    // Current price marker
    const markerX = pad.left + pricePct * chartW
    ctx.strokeStyle = '#16a34a'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(markerX, pad.top); ctx.lineTo(markerX, pad.top + chartH); ctx.stroke()
    ctx.setLineDash([])

    // X axis labels
    ctx.fillStyle = '#6b7280'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'
    for (let p = 0; p <= 100; p += 20) {
      const x = pad.left + (p / 100) * chartW
      ctx.fillText(p + '%', x, pad.top + chartH + 16)
    }

    // Left Y axis (EV $)
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const val = (rack * i) / 5
      const y = pad.top + chartH - (chartH * i) / 5
      ctx.fillText(fmt(val), pad.left - 6, y + 3)
    }

    // Right Y axis (%)
    ctx.textAlign = 'left'
    for (let i = 0; i <= 5; i++) {
      const val = (100 * i) / 5
      const y = pad.top + chartH - (chartH * i) / 5
      ctx.fillText(Math.round(val) + '%', pad.left + chartW + 6, y + 3)
    }

    // Axis labels
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
        <p className="text-sm text-gray-500 mt-1">Seasonal demand by resort, rental pricing data, and the price-to-sell probability model.</p>
      </div>

      {/* Heatmap */}
      <div className="section-label">Seasonal demand heatmap — 2BR rental value by resort × month</div>
      <div className="card mb-6 overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(12, 1fr)', gap: '3px', minWidth: '700px' }}>
          <div />
          {MONTHS.map(m => (
            <div key={m} className="text-center text-xs font-semibold text-gray-500 py-1">{m}</div>
          ))}
          {contracts.map(c => (
            <>
              <div key={c.id + '-label'} className="flex items-center text-xs text-gray-600 font-medium pr-2">{c.name}</div>
              {c.seasonal.map((d, mi) => {
                const rate = c.mktLow + (c.mktHigh - c.mktLow) * ((d - 1) / 9)
                return (
                  <div key={mi}
                    title={`${c.name} ${MONTHS[mi]}: demand ${d}/10 · est. ${fmt(rate)}/wk`}
                    className="rounded flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: heatColor(d), color: heatTextColor(d), height: '32px', fontSize: '11px', fontWeight: 600 }}>
                    {d}
                  </div>
                )
              })}
            </>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
          <span>Demand scale:</span>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="w-5 h-3.5 rounded-sm border border-gray-200"
              style={{ background: heatColor(i + 1) }} />
          ))}
          <span>Low → Peak</span>
        </div>
      </div>

      {/* Price-to-sell curve */}
      <div className="section-label">Price-to-sell probability model</div>
      <div className="card mb-6">
        <p className="text-sm text-gray-500 mb-4">
          Expected revenue peaks at <strong>65–70% of rack rate</strong> — below that you leave money on the table, above that sell probability drops sharply.
        </p>
        <div className="flex gap-6 items-end mb-4 flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Resort rack rate/wk</label>
            <input type="number" value={rack} onChange={e => setRack(Number(e.target.value))}
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
              {' · '}Expected value = <span className="text-green-700">{fmt(ev)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-gray-400 mb-2">
          <span className="flex items-center gap-1"><span className="w-4 h-2 rounded bg-green-400 inline-block" /> Expected value (left axis)</span>
          <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-400 inline-block" /> Sell probability (right axis)</span>
          <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-green-600 inline-block" /> Your price</span>
        </div>
        <canvas ref={canvasRef} width={800} height={280} className="w-full" />
      </div>

      {/* Market data table */}
      <div className="section-label">Live market data by property</div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Peak Season</th>
              <th className="text-right">Low/wk</th>
              <th className="text-right">High/wk</th>
              <th className="text-right">Rack Rate</th>
              <th className="text-right">$/pt equiv</th>
              <th>Source</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Maui Ocean Club', peak: 'Dec, Jan, Mar–Apr (whale + spring break)', low: 6000, high: 12000, rack: 10000, ptsPerWk: 6625, source: 'RedWeek Apr 2026', notes: '$7,850/wk avg · $1,121/nt peak' },
              { name: 'Canyon Villas A', peak: 'Jan (Barrett-Jackson), Feb (PGA/WM Open)', low: 1500, high: 6000, rack: 3500, ptsPerWk: 2950, source: 'RedWeek · VRBO', notes: 'Barrett-Jackson week $5k+' },
              { name: 'Canyon Villas B', peak: 'Jan (Barrett-Jackson), Feb (PGA/WM Open)', low: 1500, high: 6000, rack: 3500, ptsPerWk: 2950, source: 'RedWeek · VRBO', notes: 'Barrett-Jackson week $5k+' },
              { name: 'Ocean Pointe A', peak: 'Mar–Apr (Spring Break), Dec (holidays)', low: 2000, high: 5000, rack: 3500, ptsPerWk: 4325, source: 'RedWeek · VRBO', notes: 'From $142/nt' },
              { name: 'Ocean Pointe B', peak: 'Mar–Apr (Spring Break), Dec (holidays)', low: 2000, high: 5000, rack: 3500, ptsPerWk: 4325, source: 'RedWeek · VRBO', notes: 'From $142/nt' },
            ].map(r => (
              <tr key={r.name}>
                <td className="font-medium">{r.name}</td>
                <td className="text-xs text-gray-500">{r.peak}</td>
                <td className="text-right">{fmt(r.low)}</td>
                <td className="text-right">{fmt(r.high)}</td>
                <td className="text-right font-medium">{fmt(r.rack)}</td>
                <td className="text-right text-xs">${(r.low / r.ptsPerWk).toFixed(2)}–${(r.high / r.ptsPerWk).toFixed(2)}</td>
                <td className="text-xs text-gray-500">{r.source}</td>
                <td className="text-xs text-gray-500">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}