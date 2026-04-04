export interface Member {
  id: string; name: string; color: string; initials: string; role: 'admin' | 'member'
}
export interface Account {
  id: string; name: string; membershipLevel: string; members: Member[]
}
export interface Contract {
  id: string; name: string; loc: string; pts: number; fee: number | null
  feeConfirmed: boolean; type: 'week' | 'trust'; floor: string; season: string
  status2027: 'Available' | 'OCCUPY' | 'Elected'; seasonal: number[]
  mktLow: number; mktHigh: number; mktNote: string; defaultRate: number
}
export interface TrustContract {
  id: string; name: string; pts: number; fee: number | null; feeConfirmed: boolean
  expiry: string | null; flag: 'ok' | 'expire' | 'warn'; mktNote: string; defaultRate: number
}
export interface PlannedTrip {
  id: string; name: string; guest: string; month: string; year: number
  pts: number; booked: boolean; resort?: string
}
export interface ScheduleBlock {
  date: string; memberId: string; type: 'personal' | 'rental'
}

export const account: Account = {
  id: 'distelrath',
  name: 'Distelrath',
  membershipLevel: "Chairman's Club",
  members: [
    { id: 'dave', name: 'Dave', color: '#93c5fd', initials: 'DD', role: 'admin' },
    { id: 'sarah', name: 'Sarah', color: '#f9a8d4', initials: 'SD', role: 'member' },
    { id: 'jim', name: 'Jim', color: '#fcd34d', initials: 'JD', role: 'member' },
  ],
}

export const contracts: Contract[] = [
  {
    id: 'MU*9203*24*B',
    name: 'Maui Ocean Club',
    loc: 'Lāhainā, Maui, HI',
    pts: 6625,
    fee: 3802.68,
    feeConfirmed: true,
    type: 'week',
    floor: '2BR Ocean View',
    season: 'Platinum',
    status2027: 'Available',
    seasonal: [9, 9, 10, 9, 5, 7, 8, 7, 4, 5, 7, 10],
    mktLow: 6000,
    mktHigh: 12000,
    mktNote: 'RedWeek Apr 2026: $7,850/wk · $1,121/nt',
    defaultRate: 1.13,
  },
  {
    id: 'CV*3109*46*B',
    name: 'Canyon Villas A',
    loc: 'Scottsdale, AZ',
    pts: 2950,
    fee: 2128.14,
    feeConfirmed: true,
    type: 'week',
    floor: '2BR',
    season: 'Platinum',
    status2027: 'Available',
    seasonal: [10, 9, 8, 7, 3, 2, 2, 2, 4, 6, 6, 7],
    mktLow: 1500,
    mktHigh: 6000,
    mktNote: 'Peak: Barrett-Jackson (Jan), PGA (Feb)',
    defaultRate: 0.51,
  },
  {
    id: 'CV*3259*50*B',
    name: 'Canyon Villas B',
    loc: 'Scottsdale, AZ',
    pts: 2950,
    fee: 2128.14,
    feeConfirmed: true,
    type: 'week',
    floor: '2BR',
    season: 'Platinum',
    status2027: 'Available',
    seasonal: [10, 9, 8, 7, 3, 2, 2, 2, 4, 6, 6, 7],
    mktLow: 1500,
    mktHigh: 6000,
    mktNote: 'Peak: Barrett-Jackson (Jan), PGA (Feb)',
    defaultRate: 0.51,
  },
    {
    id: 'PS*5320*06*B',
    name: 'Ocean Pointe A',
    loc: 'Palm Beach Shores, FL',
    pts: 4325,
    fee: 2923.18,
    feeConfirmed: true,
    type: 'week',
    floor: '2BR Ocean Side',
    season: 'Platinum',
    status2027: 'OCCUPY',
    seasonal: [8, 8, 9, 7, 7, 8, 8, 7, 5, 6, 8, 9],
    mktLow: 2500,
    mktHigh: 5000,
    mktNote: 'RedWeek from $142/nt · Peak: Spring Break, Dec',
    defaultRate: 0.69,
  },
  {
    id: 'PS*8116*10*B',
    name: 'Ocean Pointe B',
    loc: 'Palm Beach Shores, FL',
    pts: 4325,
    fee: 2923.18,
    feeConfirmed: true,
    type: 'week',
    floor: '2BR Ocean Side',
    season: 'Platinum',
    status2027: 'OCCUPY',
    seasonal: [8, 8, 9, 7, 7, 8, 8, 7, 5, 6, 8, 9],
    mktLow: 2500,
    mktHigh: 5000,
    mktNote: 'RedWeek from $142/nt · Peak: Spring Break, Dec',
    defaultRate: 0.69,
  },
]

export const trustContracts: TrustContract[] = [
  {
    id: '10609899',
    name: 'MVCD Trust 2026',
    pts: 11750,
    fee: 9893.90,
    feeConfirmed: true,
    expiry: '12/31/2026',
    flag: 'expire',
    mktNote: 'Varies by resort booked — Hawaii ~$0.80/pt, Orlando ~$0.30/pt',
    defaultRate: 0.55,
  },
  {
    id: '10648719',
    name: 'MVCD Trust 2027',
    pts: 11750,
    fee: null,
    feeConfirmed: false,
    expiry: null,
    flag: 'ok',
    mktNote: 'Starts 1/1/2027',
    defaultRate: 0.55,
  },
  {
    id: '1348954',
    name: 'MVCD Trust (legacy)',
    pts: 1500,
    fee: null,
    feeConfirmed: false,
    expiry: '12/31/2026',
    flag: 'expire',
    mktNote: 'Expires 12/31/2026 — use or lose',
    defaultRate: 0.45,
  },
  {
    id: '1673690',
    name: 'MVCD Trust (legacy)',
    pts: 2250,
    fee: null,
    feeConfirmed: false,
    expiry: null,
    flag: 'warn',
    mktNote: 'Invalid expiry date — verify with Marriott',
    defaultRate: 0.45,
  },
  {
    id: '1753382',
    name: 'MVCD Trust (legacy)',
    pts: 3000,
    fee: null,
    feeConfirmed: false,
    expiry: null,
    flag: 'warn',
    mktNote: 'Invalid expiry date — verify with Marriott',
    defaultRate: 0.45,
  },
]

export const TOTAL_CONFIRMED_FEES = 23799.22

export const liveBalances2026 = [
  { contractId: 'MU*9203*24*B', type: 'Annual', pts: 2107 },
  { contractId: 'MU*9203*24*B', type: 'Hold', pts: 124 },
  { contractId: 'CV*3259*50*B', type: 'Hold', pts: 1032 },
  { contractId: '10609899',     type: 'Trust Annual', pts: 925 },
]

export const totalAvailable2026 = 5956

export const plannedTrips: PlannedTrip[] = [
  { id: '1', name: 'Barrett-Jackson', guest: 'Dave', month: 'Jan', year: 2026, pts: 2350, booked: true, resort: 'Canyon Villas' },
  { id: '2', name: 'Grande Vista', guest: 'Dave/David', month: 'Mar', year: 2026, pts: 1311, booked: true, resort: 'Grande Vista' },
  { id: '3', name: 'MVC Waikiki', guest: 'James', month: 'Apr', year: 2026, pts: 665, booked: true, resort: 'MVC Waikiki' },
  { id: '4', name: 'Kauai Lagoons', guest: 'Dave', month: 'Mar', year: 2026, pts: 3175, booked: true, resort: 'Kauai Lagoons' },
  { id: '5', name: 'Ko Olina Beach Club', guest: 'Dave', month: 'Apr', year: 2026, pts: 1234, booked: true, resort: 'Ko Olina' },
  { id: '6', name: 'Luke Combs - Grand Chateau', guest: 'Dave', month: 'Mar', year: 2026, pts: 4407, booked: true, resort: 'Grand Chateau' },
  { id: '7', name: 'Newport Coast Villas', guest: 'Dave', month: 'Feb', year: 2027, pts: 2321, booked: true, resort: 'Newport Coast' },
  { id: '8', name: 'Ocean Pointe (Occupy)', guest: 'Dave', month: 'TBD', year: 2027, pts: 4325, booked: true, resort: 'Ocean Pointe' },
  { id: '9', name: 'Ocean Pointe (Occupy)', guest: 'David', month: 'TBD', year: 2027, pts: 4325, booked: true, resort: 'Ocean Pointe' },
]
// Per-year point allocations — what's actually available each year
export const yearlyAllocations = {
  2026: {
    elected: 21175,  // MU(6625) + CV-A(2950) + CV-B(2950) + OP-A(4325) + OP-B(4325)
    primaryTrust: 11750,  // Trust 10609899
    legacyTrust: 6750,    // 1348954(1500) + 1673690(2250) + 1753382(3000) — expiring/uncertain
    total: 39675,
    recurringTotal: 32925, // elected + primary trust only
  },
  2027: {
    elected: 21175,
    primaryTrust: 11750,  // Trust 10648719 takes over
    legacyTrust: 0,       // 1348954 expires 12/31/2026
    total: 32925,
    recurringTotal: 32925,
    note: 'Ocean Pointe weeks set to Occupy — 8,650 pts allocated to personal use'
  },
  2028: {
    elected: 21175,
    primaryTrust: 11750,
    legacyTrust: 0,
    total: 32925,
    recurringTotal: 32925,
  }
}

// Arbitrage opportunities — trust point bookings that yield above break-even
export const arbitrageTargets = [
  { resort: 'Maui Ocean Club', ptsNeeded: 6625, mktLow: 6000, mktHigh: 12000, evPerPt: 1.13, note: 'Highest $/pt in portfolio' },
  { resort: 'Ko Olina Beach Club', ptsNeeded: 4500, mktLow: 4000, mktHigh: 8000, evPerPt: 0.98, note: 'Hawaii premium' },
  { resort: 'Kauai Lagoons', ptsNeeded: 3500, mktLow: 3500, mktHigh: 7000, evPerPt: 0.95, note: 'Hawaii premium' },
  { resort: 'Newport Coast Villas', ptsNeeded: 3000, mktLow: 2500, mktHigh: 5000, evPerPt: 0.82, note: 'SoCal coastal premium' },
  { resort: 'Grand Chateau', ptsNeeded: 2500, mktLow: 2000, mktHigh: 4500, evPerPt: 0.78, note: 'Las Vegas events premium' },
  { resort: 'Canyon Villas', ptsNeeded: 2950, mktLow: 1500, mktHigh: 6000, evPerPt: 0.51, note: 'Event-driven spikes' },
  { resort: 'Ocean Pointe', ptsNeeded: 4325, mktLow: 2000, mktHigh: 5000, evPerPt: 0.69, note: 'FL seasonal' },
]