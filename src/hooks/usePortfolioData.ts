import { useQuery } from '@tanstack/react-query'
import {
  getAccount, getContracts, getTrustContracts, getPlannedTrips,
  getLiveBalances, getTotalAvailable, getTotalFees, getYearlyAllocations,
  getResorts,
} from '../api'

// Data changes infrequently — cache for 5 minutes, never refetch on window focus
const defaultOptions = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } as const

export function useAccount() {
  return useQuery({ queryKey: ['account'], queryFn: getAccount, ...defaultOptions })
}

export function useContracts() {
  return useQuery({ queryKey: ['contracts'], queryFn: getContracts, ...defaultOptions })
}

export function useTrustContracts() {
  return useQuery({ queryKey: ['trustContracts'], queryFn: getTrustContracts, ...defaultOptions })
}

export function usePlannedTrips() {
  return useQuery({ queryKey: ['plannedTrips'], queryFn: getPlannedTrips, ...defaultOptions })
}

export function useLiveBalances() {
  return useQuery({ queryKey: ['liveBalances'], queryFn: getLiveBalances, ...defaultOptions })
}

export function useTotalAvailable() {
  return useQuery({ queryKey: ['totalAvailable'], queryFn: getTotalAvailable, ...defaultOptions })
}

export function useTotalFees() {
  return useQuery({ queryKey: ['totalFees'], queryFn: getTotalFees, ...defaultOptions })
}

export function useYearlyAllocations() {
  return useQuery({ queryKey: ['yearlyAllocations'], queryFn: getYearlyAllocations, ...defaultOptions })
}

export function useResorts() {
  return useQuery({ queryKey: ['resorts'], queryFn: getResorts, staleTime: 60 * 60 * 1000, refetchOnWindowFocus: false })
}
