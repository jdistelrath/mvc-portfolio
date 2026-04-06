import { isApiEnabled } from '../config'
import { apiFetch } from './client'
import type { Account, Contract, TrustContract, PlannedTrip } from '../data/portfolio'
import {
  account as localAccount,
  contracts as localContracts,
  trustContracts as localTrustContracts,
  plannedTrips as localPlannedTrips,
  liveBalances2026 as localLiveBalances,
  totalAvailable2026 as localTotalAvailable,
  TOTAL_CONFIRMED_FEES as localTotalFees,
  yearlyAllocations as localYearlyAllocations,
} from '../data/portfolio'

export async function getAccount(): Promise<Account> {
  if (!isApiEnabled) return localAccount
  return apiFetch('/account')
}

export async function getContracts(): Promise<Contract[]> {
  if (!isApiEnabled) return localContracts
  return apiFetch('/contracts')
}

export async function getTrustContracts(): Promise<TrustContract[]> {
  if (!isApiEnabled) return localTrustContracts
  return apiFetch('/contracts/trust')
}

export async function getPlannedTrips(): Promise<PlannedTrip[]> {
  if (!isApiEnabled) return localPlannedTrips
  return apiFetch('/trips')
}

export async function getLiveBalances(): Promise<typeof localLiveBalances> {
  if (!isApiEnabled) return localLiveBalances
  return apiFetch('/balances?year=2026')
}

export async function getTotalAvailable(): Promise<number> {
  if (!isApiEnabled) return localTotalAvailable
  return apiFetch('/balances/total?year=2026')
}

export async function getTotalFees(): Promise<number> {
  if (!isApiEnabled) return localTotalFees
  return apiFetch('/fees/total')
}

export async function getYearlyAllocations(): Promise<typeof localYearlyAllocations> {
  if (!isApiEnabled) return localYearlyAllocations
  return apiFetch('/allocations')
}
