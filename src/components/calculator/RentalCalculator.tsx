import { useState, useEffect } from 'react'
import { useContracts, useTrustContracts, useTotalFees, useYearlyAllocations } from '../../hooks/usePortfolioData'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()
const fmtPts = (n: number) => Math.round(n).toLocaleString() + ' pts'

interface WeekSetting {
  contractId: string
  availableToRent: boolean
  ratePerPoint: number
}

interface TrustSetting {
  contractId: string
  ptsAllocated: number
  ratePerPoint: number
}

export default function RentalCalculator() {
  const { data: contracts = [] } = useContracts()
  const { data: trustContracts = [] } = useTrustContracts()
  const { data: totalFees = 0 } = useTotalFees()
  const { data: yearlyAllocations } = useYearlyAllocations()

  const [coveragePct, setCoveragePct] = useState(100)
  const [weekSettings, setWeekSettings] = useState<WeekSetting[]>([])
  const [trustSettings, setTrustSettings] = useState<TrustSetting[]>([])

  // Initialize settings when data loads
  useEffect(() => {
    if (contracts.length > 0 && weekSettings.length === 0) {
      setWeekSettings(contracts.map(c => ({
        contractId: c.id,
        availableToRent: ['MU*9203*24*B', 'CV*3109*46*B', 'CV*3259*50*B'].includes(c.id),
        ratePerPoint: c.defaultRate,
      })))
    }
  }, [contracts, weekSettings.length])

  useEffect(() => {
    if (trustContracts.length > 0 && trustSettings.length === 0) {
      setTrustSettings(trustContracts.map(t => ({
        contractId: t.id,
        ptsAllocated: 0,
        ratePerPoint: t.defaultRate,
      })))
    }
  }, [trustContracts, trustSettings.length])

  const target = totalFees * (coveragePct / 100)

  const weekRevenue = contracts.reduce((sum, c) => {
    const s = weekSettings.find(x => x.contractId === c.id)
    if (!s?.availableToRent) return sum
    return sum + c.pts * s.ratePerPoint
  }, 0)

  const trustRevenue = trustContracts.reduce((sum, t) => {
    const s = trustSettings.find(x => x.contractId === t.id)
    if (!s) return sum
    return sum + s.ptsAllocated * s.ratePerPoint
  }, 0)

  const totalRevenue = weekRevenue + trustRevenue
  const coverage = target > 0 ? Math.min(200, (totalRevenue / target) * 100) : 100
  const gap = target - totalRevenue

  const rentalPts = contracts.reduce((sum, c) => {
    const s = weekSettings.find(x => x.contractId === c.id)
    return sum + (s?.availableToRent ? c.pts : 0)
  }, 0)

  const trustRentalPts = trustSettings.reduce((sum, s) => sum + s.ptsAllocated, 0)

  const totalPts = yearlyAllocations?.[2026]?.recurringTotal ?? 0
  const personalPts = totalPts - rentalPts - trustRentalPts

  const toggleWeek = (contractId: string) => {
    setWeekSettings(prev => prev.map(s =>
      s.contractId === contractId ? { ...s, availableToRent: !s.availableToRent } : s
    ))
  }

  const updateWeekRate = (contractId: string, rate: number) => {
    setWeekSettings(prev => prev.map(s =>
      s.contractId === contractId ? { ...s, ratePerPoint: rate } : s
    ))
  }

  const updateTrustAlloc = (contractId: string, pts: number) => {
    setTrustSettings(prev => prev.map(s =>
      s.contractId === contractId ? { ...s, ptsAllocated: pts } : s
    ))
  }

  const updateTrustRate = (contractId: string, rate: number) => {
    setTrustSettings(prev => prev.map(s =>
      s.contractId === contractId ? { ...s, ratePerPoint: rate } : s
    ))
  }

  const coverageColor = coverage >= 95 ? 'text-green-700' : coverage >= 70 ? 'text-amber-700' : 'text-red-700'
  const coverageChip = coverage >= 95 ? 'chip-green' : coverage >= 70 ? 'chip-amber' : 'chip-red'
  const personalColor = personalPts > 12000 ? 'text-green-700' : personalPts > 6000 ? 'text-amber-700' : 'text-red-700'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Rental Coverage Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">How much maintenance can rentals cover — and what points are left for personal use?</p>
      </div>

      {/* Step 1 — Coverage target */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-500">1</div>
          <div>
            <div className="font-semibold text-sm">Set your maintenance coverage target</div>
            <div className="text-xs text-gray-500">What % of annual fees do you want rentals to cover?</div>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs text-gray-500 w-16">Coverage</span>
          <input type="range" min={0} max={150} step={5} value={coveragePct}
            onChange={e => setCoveragePct(Number(e.target.value))}
            className="flex-1 accent-green-600" />
          <span className="text-base font-semibold w-16 text-right">{coveragePct}%</span>
        </div>
        <div className="flex gap-6 flex-wrap">
          <div>
            <div className="text-3xl font-semibold text-gray-900">{fmt(target)}</div>
            <div className="text-xs text-gray-500">rental revenue target</div>
            <div className="w-48 h-1.5 bg-gray-100 rounded mt-2 overflow-hidden">
              <div className="h-full rounded transition-all"
                style={{
                  width: `${Math.min(100, coveragePct)}%`,
                  background: coveragePct > 100 ? '#E24B4A' : coveragePct > 75 ? '#BA7517' : '#1D9E75'
                }} />
            </div>
            <div className="text-xs text-gray-400 mt-1">of {fmt(totalFees)} total confirmed fees</div>
          </div>
          <div className="flex-1 min-w-48">
            <div className="text-xs text-gray-500 mb-2">Fee breakdown</div>
            {[
              { label: 'Maui Ocean Club', val: 3802.68 },
              { label: 'Canyon Villas A', val: 2128.14 },
              { label: 'Canyon Villas B', val: 2128.14 },
              { label: 'Ocean Pointe A', val: 2923.18 },
              { label: 'Ocean Pointe B', val: 2923.18 },
              { label: 'MVC Trust', val: 9893.90 },
            ].map(f => (
              <div key={f.label} className="flex justify-between text-xs py-0.5 border-b border-gray-100">
                <span className="text-gray-500">{f.label}</span>
                <span>{fmt(f.val)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs py-1 font-semibold">
              <span>Total</span><span>{fmt(totalFees)}</span>
            </div>
          </div>
          <div className="flex-1 min-w-48 text-sm text-gray-600 leading-relaxed">
            {coveragePct === 0 && 'No rental activity — 100% out-of-pocket on all fees.'}
            {coveragePct > 0 && coveragePct < 100 && `Rentals cover ${coveragePct}% of fees — you pay roughly ${fmt(totalFees - target)} out-of-pocket.`}
            {coveragePct === 100 && 'Rentals fully cover all maintenance — zero out-of-pocket.'}
            {coveragePct > 100 && `Rentals exceed fees — estimated ${fmt(totalRevenue - totalFees)} annual profit after all fees.`}
          </div>
        </div>
      </div>

      {/* Step 2 — Elected weeks */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-500">2</div>
          <div>
            <div className="font-semibold text-sm">Elected weeks — available to rent?</div>
            <div className="text-xs text-gray-500">Toggle off weeks reserved for personal use. Rates are editable market estimates.</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {contracts.map((c) => {
            const s = weekSettings.find(x => x.contractId === c.id)
            if (!s) return null
            const rev = s.availableToRent ? c.pts * s.ratePerPoint : 0
            return (
              <div key={c.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  s.availableToRent
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-white opacity-60'
                }`}
                onClick={() => toggleWeek(c.id)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-xs font-mono text-gray-400">{c.id}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="font-semibold">{c.pts.toLocaleString()} pts</div>
                    <div onClick={e => { e.stopPropagation(); toggleWeek(c.id) }}
                      className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${s.availableToRent ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${s.availableToRent ? 'left-4' : 'left-0.5'}`} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded">
                    {c.mktNote.split('\xB7')[0].trim()}
                  </span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-gray-400">$/pt:</span>
                    <input type="number" step="0.01"
                      value={s.ratePerPoint}
                      onChange={e => updateWeekRate(c.id, parseFloat(e.target.value) || 0)}
                      className="w-14 text-xs text-right border border-gray-200 rounded px-1 py-0.5 bg-white" />
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Fee: {fmt(c.fee ?? 0)}/yr · Break-even: {fmt(Math.round((c.fee ?? 0) / 7))}/nt
                  {s.availableToRent && <span className="text-green-700 font-medium"> · Est. {fmt(rev)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 3 — Trust points */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-500">3</div>
          <div>
            <div className="font-semibold text-sm">Trust points — how many to allocate to rentals?</div>
            <div className="text-xs text-gray-500">Slide to set how many trust points are available for rental reservations</div>
          </div>
        </div>
        <div className="space-y-4">
          {trustContracts.map((t) => {
            const s = trustSettings.find(x => x.contractId === t.id)
            if (!s) return null
            const rev = s.ptsAllocated * s.ratePerPoint
            const pct = Math.round((s.ptsAllocated / t.pts) * 100)
            return (
              <div key={t.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs font-mono text-gray-400">{t.id}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.mktNote}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{s.ptsAllocated.toLocaleString()} pts to rent</div>
                    <div className="text-xs text-green-700">Est. {fmt(rev)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4">0</span>
                  <input type="range" min={0} max={t.pts} step={250}
                    value={s.ptsAllocated}
                    onChange={e => updateTrustAlloc(t.id, parseInt(e.target.value))}
                    className="flex-1 accent-green-600" />
                  <span className="text-xs text-gray-400 w-12 text-right">{t.pts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">{pct}% of trust points allocated</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">$/pt:</span>
                    <input type="number" step="0.01"
                      value={s.ratePerPoint}
                      onChange={e => updateTrustRate(t.id, parseFloat(e.target.value) || 0)}
                      className="w-14 text-xs text-right border border-gray-200 rounded px-1 py-0.5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Results */}
      <div className="bg-gray-100 rounded-xl p-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Revenue target', value: fmt(target), sub: `${coveragePct}% of ${fmt(totalFees)}`, color: 'text-gray-900' },
            { label: 'Est. rental revenue', value: fmt(totalRevenue), sub: `${Math.round(coverage)}% of target`, color: coverageColor },
            { label: 'Usable personal pts', value: fmtPts(personalPts), sub: `${totalPts > 0 ? Math.round(personalPts / totalPts * 100) : 0}% of total portfolio`, color: personalColor },
          ].map(r => (
            <div key={r.label} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{r.label}</div>
              <div className={`text-xl font-semibold ${r.color}`}>{r.value}</div>
              <div className="text-xs text-gray-400 mt-1">{r.sub}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Coverage status</span>
            <span className={`chip ${coverageChip}`}>{Math.round(coverage)}% of target</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">From elected weeks</span>
            <span>{fmt(weekRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">From trust points</span>
            <span>{fmt(trustRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1.5">
            <span>Total rental revenue</span>
            <span>{fmt(totalRevenue)}</span>
          </div>
          {gap > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Gap remaining</span>
              <span className="text-red-600">{fmt(gap)} uncovered</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Surplus above target</span>
              <span className="text-green-600">+{fmt(-gap)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold">
            <span>Personal use points</span>
            <span className={personalColor}>{fmtPts(personalPts)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
