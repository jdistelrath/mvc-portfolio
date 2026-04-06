import { useState } from 'react'
import { useAccount } from '../../hooks/usePortfolioData'
import { getBlocksForYear, getPointsForYear } from '../../data/historicalSchedule'

const MONTHS_FULL = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

type MemberType = 'dave' | 'sarah' | 'jim' | 'rental'

// Each day can have multiple members assigned simultaneously
interface DayBlock {
  members: Set<MemberType>
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

const memberLabels: Record<string, string> = {
  dave: 'D',
  sarah: 'S',
  jim: 'J',
  rental: '$',
}

// Convert historical single-member blocks to multi-member format
function historicalToMulti(year: number): Record<string, DayBlock> {
  const raw = getBlocksForYear(year)
  const result: Record<string, DayBlock> = {}
  for (const [key, val] of Object.entries(raw)) {
    if (!result[key]) result[key] = { members: new Set() }
    result[key].members.add(val.type)
  }
  return result
}

// Serialize/deserialize Sets for state (Sets aren't directly clonable)
function cloneBlocks(blocks: Record<string, DayBlock>): Record<string, DayBlock> {
  const out: Record<string, DayBlock> = {}
  for (const [k, v] of Object.entries(blocks)) {
    out[k] = { members: new Set(v.members) }
  }
  return out
}

export default function Schedule() {
  const { data: account } = useAccount()
  const [year, setYear] = useState(2026)
  const [activeMember, setActiveMember] = useState<MemberType>('dave')
  const [yearBlocks, setYearBlocks] = useState<Record<number, Record<string, DayBlock>>>({})

  const blocks = yearBlocks[year] ?? historicalToMulti(year)

  const toggleDay = (dateKey: string) => {
    setYearBlocks(prev => {
      const current = cloneBlocks(prev[year] ?? historicalToMulti(year))
      if (!current[dateKey]) current[dateKey] = { members: new Set() }

      const day = current[dateKey]
      if (day.members.has(activeMember)) {
        day.members.delete(activeMember)
        if (day.members.size === 0) delete current[dateKey]
      } else {
        day.members.add(activeMember)
      }
      return { ...prev, [year]: current }
    })
  }

  const clearAll = () => setYearBlocks(prev => ({ ...prev, [year]: {} }))

  const exportJSON = () => {
    // Convert Sets to arrays for JSON serialization
    const serializable: Record<string, { members: string[] }> = {}
    for (const [k, v] of Object.entries(blocks)) {
      serializable[k] = { members: [...v.members] }
    }
    const blob = new Blob([JSON.stringify(serializable, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mvc-schedule-${year}.json`
    a.click()
  }

  // Count days per member (a day with 2 members counts for both)
  const counts = { dave: 0, sarah: 0, jim: 0, rental: 0 }
  Object.values(blocks).forEach(b => {
    b.members.forEach(m => { counts[m]++ })
  })

  const renderDayCell = (day: number, dateKey: string) => {
    const block = blocks[dateKey]
    const assignedMembers = block ? [...block.members] : []
    const isEmpty = assignedMembers.length === 0

    if (isEmpty) {
      return (
        <div key={day}
          onClick={() => toggleDay(dateKey)}
          className="relative cursor-pointer rounded text-xs flex items-center justify-center transition-all hover:opacity-80"
          style={{
            height: '32px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            color: '#6b7280',
          }}>
          <span>{day}</span>
        </div>
      )
    }

    // Split the cell into sections — one per assigned member
    const sectionHeight = Math.floor(32 / assignedMembers.length)

    return (
      <div key={day}
        onClick={() => toggleDay(dateKey)}
        className="relative cursor-pointer rounded overflow-hidden transition-all hover:opacity-80"
        style={{ height: '32px', border: '1px solid #d1d5db' }}
        title={assignedMembers.map(m => m === 'rental' ? 'Rental' : m.charAt(0).toUpperCase() + m.slice(1)).join(' + ')}>
        {assignedMembers.map((m, i) => (
          <div key={m}
            className="flex items-center justify-center"
            style={{
              height: i === assignedMembers.length - 1
                ? `${32 - sectionHeight * i}px`  // last section gets remaining space
                : `${sectionHeight}px`,
              background: memberColors[m],
              color: memberTextColors[m],
              fontSize: assignedMembers.length > 2 ? '7px' : assignedMembers.length > 1 ? '8px' : '10px',
              fontWeight: 600,
              lineHeight: 1,
              borderBottom: i < assignedMembers.length - 1 ? '1px solid rgba(255,255,255,0.6)' : 'none',
            }}>
            {assignedMembers.length === 1 ? (
              <span className="flex flex-col items-center">
                <span style={{ fontSize: '10px' }}>{day}</span>
                <span style={{ fontSize: '7px' }}>{memberLabels[m]}</span>
              </span>
            ) : (
              <span>{memberLabels[m]}</span>
            )}
          </div>
        ))}
        {/* Overlay the day number when multi-assigned */}
        {assignedMembers.length > 1 && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ fontSize: '8px', fontWeight: 700, color: '#374151', textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>
            {day}
          </span>
        )}
      </div>
    )
  }

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
            return renderDayCell(day, dateKey)
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Family Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">
          Block weeks for each member or mark as rental. Multiple members can share the same day.
          Click to assign the active member; click again to remove.
        </p>
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
            {([...(account?.members ?? []).map(m => ({ id: m.id as MemberType, name: m.name, color: m.color })),
               { id: 'rental' as MemberType, name: 'Rental', color: memberColors.rental }
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
            {Object.values(counts).reduce((s, n) => s + n, 0)} member-days
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
        <span className="text-gray-300 mx-1">|</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{
            background: `linear-gradient(to bottom, ${memberColors.dave} 50%, ${memberColors.jim} 50%)`,
          }} />
          Shared day (split view)
        </span>
      </div>
    </div>
  )
}
