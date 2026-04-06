import { Routes, Route, NavLink } from 'react-router-dom'
import { useAccount } from './hooks/usePortfolioData'
import Dashboard from './components/dashboard/Dashboard'
import RentalCalculator from './components/calculator/RentalCalculator'
import MarketIntelligence from './components/market/MarketIntelligence'
import Optimizer from './components/optimizer/Optimizer'
import Schedule from './components/schedule/Schedule'

export default function App() {
  const { data: account } = useAccount()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-0">
          <div className="flex items-center gap-2 pr-6 border-r border-gray-200 mr-4 py-3">
            <span className="font-semibold text-gray-900">MVC Portfolio</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--gold)', color: 'var(--gold-text)' }}>
              {account?.membershipLevel ?? ''}
            </span>
          </div>
          <div className="flex overflow-x-auto">
            {[
              { to: '/', label: 'Dashboard' },
              { to: '/calculator', label: 'Rental Calculator' },
              { to: '/market', label: 'Market Intelligence' },
              { to: '/optimizer', label: 'Optimizer' },
              { to: '/schedule', label: 'Schedule' },
            ].map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-4 text-sm border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-gray-900 text-gray-900 font-medium'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`
                }>
                {label}
              </NavLink>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 pl-4">
            {account?.members.map(m => (
              <div key={m.id} title={m.name}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer"
                style={{ background: m.color, color: '#1a1a18' }}>
                <span>{m.initials}</span>
              </div>
            ))}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calculator" element={<RentalCalculator />} />
          <Route path="/optimizer" element={<Optimizer />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/market" element={<MarketIntelligence />} />
        </Routes>
      </main>
    </div>
  )
}