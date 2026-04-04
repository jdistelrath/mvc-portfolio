// Historical trip data extracted from Dave's spreadsheet (2018-2025)
// Dates approximated to week-long blocks (Sat-Sat, typical MVC check-in)
// Member mapping: Dave=dave, Sarah=sarah, Jim/Jay/Jason=jim, Pat/Kelly/Nancy=dave (guests)

export interface HistoricalBlock {
  startDate: string // YYYY-MM-DD
  endDate: string
  label: string
  member: 'dave' | 'sarah' | 'jim' | 'rental'
  resort?: string
  pts: number
}

export const historicalTrips: HistoricalBlock[] = [
  // ── 2018 ──────────────────────────────────────────────
  { startDate: '2018-01-20', endDate: '2018-01-27', label: 'Barrett-Jackson', member: 'dave', resort: 'Canyon Villas', pts: 2225 },
  { startDate: '2018-02-10', endDate: '2018-02-17', label: 'Palm Springs', member: 'dave', resort: 'Desert Springs', pts: 2225 },
  { startDate: '2018-03-10', endDate: '2018-03-17', label: 'Aruba', member: 'dave', resort: 'Aruba Ocean Club', pts: 4650 },
  { startDate: '2018-04-07', endDate: '2018-04-14', label: 'Florida', member: 'dave', resort: 'Ocean Pointe', pts: 495 },
  { startDate: '2018-05-12', endDate: '2018-05-19', label: 'Florida (Sarah)', member: 'sarah', resort: 'Grande Vista', pts: 1220 },
  { startDate: '2018-06-09', endDate: '2018-06-16', label: 'Rod Stewart - Las Vegas', member: 'dave', resort: 'Grand Chateau', pts: 2250 },
  { startDate: '2018-10-06', endDate: '2018-10-13', label: 'St Thomas (Sarah)', member: 'sarah', resort: 'St Thomas', pts: 1750 },
  { startDate: '2018-10-20', endDate: '2018-10-27', label: 'Danube River Cruise', member: 'dave', resort: 'Explorer Collection', pts: 18000 },
  // ── 2019 ──────────────────────────────────────────────
  { startDate: '2019-01-19', endDate: '2019-01-26', label: 'Barrett-Jackson', member: 'dave', resort: 'Canyon Villas', pts: 2225 },
  { startDate: '2019-01-05', endDate: '2019-01-12', label: 'Newport Beach (Pat)', member: 'dave', resort: 'Newport Coast', pts: 2200 },
  { startDate: '2019-02-09', endDate: '2019-02-16', label: 'Palm Springs', member: 'dave', resort: 'Desert Springs', pts: 2225 },
  { startDate: '2019-04-06', endDate: '2019-04-13', label: 'Florida', member: 'dave', resort: 'Grande Vista', pts: 5700 },
  { startDate: '2019-10-05', endDate: '2019-10-12', label: 'Hawaii - Maui', member: 'dave', resort: 'Maui Ocean Club', pts: 6625 },
  { startDate: '2019-10-12', endDate: '2019-10-19', label: 'Oahu & SFO', member: 'dave', resort: 'Ko Olina', pts: 4275 },
  // ── 2020 ──────────────────────────────────────────────
  { startDate: '2020-01-18', endDate: '2020-01-25', label: 'Barrett-Jackson', member: 'dave', resort: 'Canyon Villas', pts: 2250 },
  { startDate: '2020-01-04', endDate: '2020-01-11', label: 'Pat/Kelly', member: 'dave', resort: 'Canyon Villas', pts: 2100 },
  { startDate: '2020-02-08', endDate: '2020-02-15', label: 'Palm Springs', member: 'dave', resort: 'Desert Springs', pts: 2500 },
  // ── 2021 ──────────────────────────────────────────────
  { startDate: '2021-01-16', endDate: '2021-01-23', label: 'Barrett-Jackson', member: 'dave', resort: 'Canyon Villas', pts: 2250 },
  { startDate: '2021-01-09', endDate: '2021-01-16', label: 'Pat/Kelly', member: 'dave', resort: 'Canyon Villas', pts: 2100 },
  { startDate: '2021-02-06', endDate: '2021-02-13', label: 'Marco Island', member: 'dave', resort: 'Marco Island', pts: 3650 },
  { startDate: '2021-03-06', endDate: '2021-03-13', label: 'Aruba', member: 'dave', resort: 'Aruba Ocean Club', pts: 3250 },
  { startDate: '2021-03-13', endDate: '2021-03-20', label: 'Florida', member: 'dave', resort: 'Grande Vista', pts: 1750 },
  { startDate: '2021-03-20', endDate: '2021-03-27', label: 'Lakeshore Res (Jay)', member: 'jim', resort: 'Lakeshore Reserve', pts: 1750 },
  { startDate: '2021-05-01', endDate: '2021-05-08', label: 'Miami (Jay)', member: 'jim', resort: 'Miami', pts: 280 },
  { startDate: '2021-10-02', endDate: '2021-10-09', label: 'Hawaii - Maui', member: 'dave', resort: 'Maui Ocean Club', pts: 650 },
  { startDate: '2021-11-06', endDate: '2021-11-13', label: 'Grande Vista (Jay)', member: 'jim', resort: 'Grande Vista', pts: 2500 },
  // ── 2022 ──────────────────────────────────────────────
  { startDate: '2022-01-22', endDate: '2022-01-29', label: 'Barrett-Jackson', member: 'dave', resort: 'Canyon Villas', pts: 3550 },
  { startDate: '2022-02-05', endDate: '2022-02-12', label: 'Oceana Palms', member: 'dave', resort: 'Ocean Pointe', pts: 4725 },
  { startDate: '2022-03-12', endDate: '2022-03-19', label: 'Grande Vista', member: 'dave', resort: 'Grande Vista', pts: 5560 },
  { startDate: '2022-03-19', endDate: '2022-03-26', label: 'Grande Vista (Jay)', member: 'jim', resort: 'Grande Vista', pts: 4225 },
  { startDate: '2022-08-06', endDate: '2022-08-13', label: 'Ocean Pointe (Jim)', member: 'jim', resort: 'Ocean Pointe', pts: 2800 },
  { startDate: '2022-11-05', endDate: '2022-11-12', label: 'Grande Vista (Jay)', member: 'jim', resort: 'Grande Vista', pts: 2250 },
  { startDate: '2022-06-04', endDate: '2022-06-11', label: 'Paul Wedding', member: 'dave', resort: 'Grande Vista', pts: 2700 },
  { startDate: '2022-09-10', endDate: '2022-09-24', label: 'Rental', member: 'rental', pts: 18200 },
  // ── 2023 ──────────────────────────────────────────────
  { startDate: '2023-01-21', endDate: '2023-01-28', label: 'Barrett-Jackson', member: 'dave', resort: 'Canyon Villas', pts: 2950 },
  { startDate: '2023-02-04', endDate: '2023-02-11', label: 'Travelex', member: 'dave', resort: 'Grande Vista', pts: 800 },
  { startDate: '2023-03-11', endDate: '2023-03-18', label: 'Grande Vista', member: 'dave', resort: 'Grande Vista', pts: 3402 },
  { startDate: '2023-03-18', endDate: '2023-03-25', label: 'Cypress Harbor', member: 'dave', resort: 'Cypress Harbour', pts: 2300 },
  { startDate: '2023-03-04', endDate: '2023-03-11', label: 'Grande Vista (Jay)', member: 'jim', resort: 'Grande Vista', pts: 4225 },
  { startDate: '2023-03-25', endDate: '2023-04-01', label: 'Grande Vista (Jay)', member: 'jim', resort: 'Grande Vista', pts: 1700 },
  { startDate: '2023-04-08', endDate: '2023-04-15', label: 'Newport (Jay)', member: 'jim', resort: 'Newport Coast', pts: 910 },
  { startDate: '2023-02-18', endDate: '2023-02-25', label: 'Phoenix (Jim)', member: 'jim', resort: 'Canyon Villas', pts: 5209 },
  { startDate: '2023-09-09', endDate: '2023-09-23', label: 'Rental', member: 'rental', pts: 12650 },
  // ── 2024 ──────────────────────────────────────────────
  { startDate: '2024-01-20', endDate: '2024-01-27', label: 'Barrett-Jackson', member: 'dave', resort: 'Canyon Villas', pts: 2950 },
  { startDate: '2024-01-06', endDate: '2024-01-13', label: 'Pat/Kelly', member: 'dave', resort: 'Canyon Villas', pts: 1825 },
  { startDate: '2024-03-09', endDate: '2024-03-16', label: 'Grande Vista/Cypress', member: 'dave', resort: 'Grande Vista', pts: 5500 },
  { startDate: '2024-09-14', endDate: '2024-09-21', label: 'Hawaii - Ko Olina', member: 'dave', resort: 'Ko Olina', pts: 85 },
  { startDate: '2024-03-16', endDate: '2024-03-23', label: 'Jason trip', member: 'jim', resort: 'Grande Vista', pts: 8388 },
  { startDate: '2024-02-03', endDate: '2024-02-10', label: 'Jim trip', member: 'jim', resort: 'Canyon Villas', pts: 1066 },
  { startDate: '2024-10-05', endDate: '2024-10-19', label: 'Rental', member: 'rental', pts: 14600 },
  // ── 2025 ──────────────────────────────────────────────
  { startDate: '2025-01-18', endDate: '2025-01-25', label: 'Barrett-Jackson', member: 'dave', resort: 'Canyon Villas', pts: 2450 },
  { startDate: '2025-03-08', endDate: '2025-03-15', label: 'Florida', member: 'dave', resort: 'Grande Vista', pts: 2754 },
  { startDate: '2025-03-22', endDate: '2025-03-29', label: 'Kauai Beach Club', member: 'dave', resort: 'Kauai Beach Club', pts: 800 },
  { startDate: '2025-03-29', endDate: '2025-04-05', label: 'Waiohai Beach Club', member: 'dave', resort: 'Waiohai Beach Club', pts: 1060 },
  { startDate: '2025-03-15', endDate: '2025-03-22', label: 'Jim Hawaii', member: 'jim', resort: 'Maui Ocean Club', pts: 5385 },
  { startDate: '2025-09-20', endDate: '2025-09-27', label: 'Hawaii', member: 'dave', resort: 'Ko Olina', pts: 9590 },
  { startDate: '2025-11-15', endDate: '2025-11-22', label: 'Lakeshore Reserve', member: 'dave', resort: 'Lakeshore Reserve', pts: 354 },
  { startDate: '2025-09-04', endDate: '2025-09-11', label: 'Maui (Jay)', member: 'jim', resort: 'Maui Ocean Club', pts: 3723 },
  { startDate: '2025-03-23', endDate: '2025-03-30', label: 'Ko Olina (Jay)', member: 'jim', resort: 'Ko Olina', pts: 475 },
  { startDate: '2025-10-05', endDate: '2025-10-19', label: 'Rental', member: 'rental', pts: 14600 },
]

// Convert to day-level blocks for the schedule component
export function getBlocksForYear(year: number): Record<string, { type: 'dave' | 'sarah' | 'jim' | 'rental', label: string }> {
  const blocks: Record<string, { type: 'dave' | 'sarah' | 'jim' | 'rental', label: string }> = {}

  historicalTrips
    .filter(trip => trip.startDate.startsWith(String(year)))
    .forEach(trip => {
      const start = new Date(trip.startDate)
      const end = new Date(trip.endDate)
      const current = new Date(start)
      while (current < end) {
        const key = current.toISOString().split('T')[0]
        blocks[key] = { type: trip.member, label: trip.label }
        current.setDate(current.getDate() + 1)
      }
    })

  return blocks
}

export function getPointsForYear(year: number): Record<'dave' | 'sarah' | 'jim' | 'rental', number> {
  const pts = { dave: 0, sarah: 0, jim: 0, rental: 0 }
  historicalTrips
    .filter(trip => trip.startDate.startsWith(String(year)))
    .forEach(trip => { pts[trip.member] += (trip.pts || 0) })
  return pts
}
