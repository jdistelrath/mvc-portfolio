export interface Contract {
  id: string
  name: string
  loc: string
  pts: number
  fee: number | null
  feeConfirmed: boolean
  type: 'week' | 'trust'
  floor: string
  season: string
  status2027: 'Available' | 'OCCUPY' | 'Elected'
  seasonal: number[] // demand score Jan-Dec 1-10
  mktLow: number
  mktHigh: number
  mktNote: string
  defaultRate: number // $/point estimate
}

export interface TrustContract {
  id: string
  name: string
  pts: number
  fee: number | null
  feeConfirmed: boolean
  expiry: string | null
  flag: 'ok' | 'expire' | 'warn'
  mktNote: string
  defaultRate: number
}

export interface PointBalance {
  contractId: string
  year: number
  annual: number
  hold: number
  banked: number
  trust: number
}

export interface Member {
  id: string
  name: string
  color: string
  initials: string
  role: 'admin' | 'member'
}

export interface Account {
  id: string
  name: string
  membershipLevel: string
  members: Member[]
}

export interface PlannedTrip {
  id: string
  name: string
  guest: string
  month: string
  year: number
  pts: number
  booked: boolean
  resort?: string
}

export interface ScheduleBlock {
  date: string // YYYY-MM-DD
  memberId: string
  type: 'personal' | 'rental'
}

export interface MarketRate {
  resort: string
  month: number // 0-11
  rack: number
  low: number
  high: number
  demand: number // 1-10
  source: string
}

export interface OptimizerSlot {
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