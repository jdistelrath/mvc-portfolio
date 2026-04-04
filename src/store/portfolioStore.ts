import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlannedTrip, ScheduleBlock } from '../data/portfolio'
import { contracts, trustContracts, plannedTrips, TOTAL_CONFIRMED_FEES } from '../data/portfolio'

interface ContractRentalSettings {
  contractId: string
  availableToRent: boolean
  ratePerPoint: number
  trustPtsAllocated: number // for trust contracts only
}

interface OptimizerSettings {
  coveragePct: number
  listingPricePct: number
  minPersonalPts: number
}

interface PortfolioState {
  // Rental calculator
  rentalSettings: ContractRentalSettings[]
  coveragePct: number
  setRentalSetting: (contractId: string, key: keyof ContractRentalSettings, value: boolean | number) => void
  setCoveragePct: (pct: number) => void

  // Optimizer
  optimizerSettings: OptimizerSettings
  setOptimizerSettings: (s: Partial<OptimizerSettings>) => void

  // Year planner
  plannedTrips: PlannedTrip[]
  addTrip: (trip: PlannedTrip) => void
  removeTrip: (id: string) => void
  updateTrip: (id: string, updates: Partial<PlannedTrip>) => void

  // Schedule
  scheduleBlocks: ScheduleBlock[]
  addBlock: (block: ScheduleBlock) => void
  removeBlock: (date: string, memberId: string) => void
  clearSchedule: () => void

  // Computed helpers
  totalFees: number
  getRentalRevenue: () => number
  getPersonalPoints: () => number
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      // Default rental settings — one entry per contract
      rentalSettings: [
        ...contracts.map(c => ({
          contractId: c.id,
          availableToRent: ['MU*9203*24*B', 'CV*3109*46*B', 'CV*3259*50*B'].includes(c.id),
          ratePerPoint: c.defaultRate,
          trustPtsAllocated: 0,
        })),
        ...trustContracts.map(t => ({
          contractId: t.id,
          availableToRent: false,
          ratePerPoint: t.defaultRate,
          trustPtsAllocated: 0,
        })),
      ],

      coveragePct: 100,
      setCoveragePct: (pct) => set({ coveragePct: pct }),

      setRentalSetting: (contractId, key, value) =>
        set(state => ({
          rentalSettings: state.rentalSettings.map(s =>
            s.contractId === contractId ? { ...s, [key]: value } : s
          ),
        })),

      optimizerSettings: {
        coveragePct: 100,
        listingPricePct: 68,
        minPersonalPts: 8000,
      },
      setOptimizerSettings: (updates) =>
        set(state => ({
          optimizerSettings: { ...state.optimizerSettings, ...updates },
        })),

      plannedTrips: plannedTrips,
      addTrip: (trip) =>
        set(state => ({ plannedTrips: [...state.plannedTrips, trip] })),
      removeTrip: (id) =>
        set(state => ({ plannedTrips: state.plannedTrips.filter(t => t.id !== id) })),
      updateTrip: (id, updates) =>
        set(state => ({
          plannedTrips: state.plannedTrips.map(t => t.id === id ? { ...t, ...updates } : t),
        })),

      scheduleBlocks: [],
      addBlock: (block) =>
        set(state => ({
          scheduleBlocks: [...state.scheduleBlocks.filter(
            b => !(b.date === block.date && b.memberId === block.memberId)
          ), block],
        })),
      removeBlock: (date, memberId) =>
        set(state => ({
          scheduleBlocks: state.scheduleBlocks.filter(
            b => !(b.date === date && b.memberId === memberId)
          ),
        })),
      clearSchedule: () => set({ scheduleBlocks: [] }),

      totalFees: TOTAL_CONFIRMED_FEES,

      getRentalRevenue: () => {
        const { rentalSettings } = get()
        const weekRevenue = contracts
          .filter(c => rentalSettings.find(s => s.contractId === c.id)?.availableToRent)
          .reduce((sum, c) => {
            const setting = rentalSettings.find(s => s.contractId === c.id)
            return sum + c.pts * (setting?.ratePerPoint ?? c.defaultRate)
          }, 0)
        const trustRevenue = trustContracts.reduce((sum, t) => {
          const setting = rentalSettings.find(s => s.contractId === t.id)
          return sum + (setting?.trustPtsAllocated ?? 0) * (setting?.ratePerPoint ?? t.defaultRate)
        }, 0)
        return weekRevenue + trustRevenue
      },

      getPersonalPoints: () => {
        const { rentalSettings } = get()
        const totalPts = [...contracts, ...trustContracts].reduce((s, c) => s + c.pts, 0)
        const rentalPts = contracts
          .filter(c => rentalSettings.find(s => s.contractId === c.id)?.availableToRent)
          .reduce((s, c) => s + c.pts, 0)
        const trustRentalPts = trustContracts.reduce((s, t) => {
          const setting = rentalSettings.find(x => x.contractId === t.id)
          return s + (setting?.trustPtsAllocated ?? 0)
        }, 0)
        return totalPts - rentalPts - trustRentalPts
      },
    }),
    { name: 'mvc-portfolio-store' }
  )
)