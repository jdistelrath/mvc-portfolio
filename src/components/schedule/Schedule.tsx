import { useState } from 'react'
import { account } from '../../data/portfolio'
import { getBlocksForYear, getPointsForYear } from '../../data/historicalSchedule'

const MONTHS_FULL = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

type BlockType = 'dave' | 'sarah' | 'jim' | 'rental'

interface DayBlock {
  type: BlockType
}

const memberColors: Record<string, string> = {
  dave: '#93c5fd',
  sarah: '#f9a8d4',
  jim: '#fcd34d',
  rental: '#86efac',
}

const memberTextColors: Record<string, string> = {
  dave: '#1e3a5f',
  sarah: '#831843',
  jim: '#713f12',
  rental: '#14532d',
}

export default function Schedule() {
  const [year, setYear] = useState(2026)
  const [activeMember, setActiveMember] = useState<BlockType>('dave')
    const [yearBlocks, setYearBlocks] = useState<Record<number, Record<string, DayBlock>>>({})

  const blocks = yearBlocks[year] ?? getBlocksForYear(year)

    // blocks already initialized above with historical data for past years

    const toggleDay = (dateKey: string) => {
    setYearBlocks(prev => {
      const current = prev[year] ?? getBlocksForYear(year)
      const existing = current[dateKey]
      if (existing?.type === activeMember) {
        const next = { ...current }
        delete next[dateKey]
        return { ...prev, [year]: next }
      }
      return { ...prev, [year]: { ...current, [dateKey]: { type: activeMember } } }
    })
  }

   const clearAll = () => setYearBlocks(prev => ({ ...prev, [year]: {} }))

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(blocks, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mvc-schedule-${year}.json`
    a.click()
  }

    const counts = { dave: 0, sarah: 0, jim: 0, rental: 0, conflict: 0 }
    Object.values(blocks).forEach(b => { counts[b.type as keyof typeof counts]++ })

  const renderMonth = (monthIdx: number) => {
    const firstDay = new Date(year, monthIdx, 1).getDay()
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()

    return (
      <div key={monthIdx}>
        <div className="text-sm font-semibold text-gray-700 mb-2">{MONTHS_FULL[monthIdx]} {year}</div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-gray-400 font-medium py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array(firstDay).fill(null).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const block = blocks[dateKey]

            return (
              <div key={day}
                onClick={() => toggleDay(dateKey)}
                className="relative cursor-pointer rounded text-xs flex flex-col items-center justify-center transition-all hover:opacity-80"
                style={{
                  height: '28px',
                  background: block ? memberColors[block.type] : '#f9fafb',
                  border: block ? `1px solid ${memberTextColors[block.type]}33` : '1px solid #e5e7eb',
                  color: block ? memberTextColors[block.type] : '#6b7280',
                  fontWeight: block ? 600 : 400,
                }}>
                <span>{day}</span>
                {block && (
                  <span style={{ fontSize: '7px', lineHeight: 1 }}>
                    {block.type === 'rental' ? '$' : block.type[0].toUpperCase()}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Family Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">Block weeks for each member or mark as rental. Click a day to assign, click again to clear.</p>
      </div>

            {/* Year selector */}
      <div className="flex gap-2 mb-4">
        {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].map(yr => (
          <button key={yr}
            onClick={() => setYear(yr)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              year === yr
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}>
            {yr}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="card mb-6 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Assign to:</span>
          <div className="flex gap-2">
            {([...account.members.map(m => ({ id: m.id as BlockType, name: m.name, color: m.color })),
               { id: 'rental' as BlockType, name: 'Rental', color: memberColors.rental }
            ]).map(m => (
              <button key={m.id}
                onClick={() => setActiveMember(m.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
                style={{
                  background: activeMember === m.id ? m.color : 'white',
                  borderColor: activeMember === m.id ? memberTextColors[m.id] + '66' : '#e5e7eb',
                  color: activeMember === m.id ? memberTextColors[m.id] : '#6b7280',
                }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color, border: '1px solid ' + memberTextColors[m.id] + '44' }} />
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={clearAll} className="btn">Clear all</button>
          <button onClick={exportJSON} className="btn-primary">Export JSON</button>
        </div>
      </div>

{/* Summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Dave', key: 'dave' as const, color: memberColors.dave, textColor: memberTextColors.dave },
          { label: 'Sarah', key: 'sarah' as const, color: memberColors.sarah, textColor: memberTextColors.sarah },
          { label: 'Jim', key: 'jim' as const, color: memberColors.jim, textColor: memberTextColors.jim },
          { label: 'Rental', key: 'rental' as const, color: memberColors.rental, textColor: memberTextColors.rental },
        ].map(m => {
          const yearPts = getPointsForYear(year)
          return (
            <div key={m.label} className="metric-card">
              <div className="text-xs font-medium mb-1" style={{ color: m.textColor }}>{m.label}</div>
              <div className="text-xl font-semibold" style={{ color: m.textColor }}>
                {yearPts[m.key] > 0 ? yearPts[m.key].toLocaleString() : counts[m.key]}
              </div>
              <div className="text-xs text-gray-400">
                {yearPts[m.key] > 0 ? 'pts used' : 'days blocked'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{counts[m.key]} days</div>
            </div>
          )
        })}
        <div className="metric-card">
          <div className="text-xs font-medium text-gray-500 mb-1">Total</div>
          <div className="text-xl font-semibold text-gray-900">
             {Object.values(getPointsForYear(year)).reduce((s, n) => s + (n || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">pts used</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {Object.values(counts).reduce((s, n) => s + n, 0)} days
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        <div className="grid grid-cols-3 gap-8">
          {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-gray-500 flex-wrap">
        {[
          { label: 'Dave', color: memberColors.dave },
          { label: 'Sarah', color: memberColors.sarah },
          { label: 'Jim', color: memberColors.jim },
          { label: 'Rental', color: memberColors.rental },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}