import { isApiEnabled } from '../config'
import { apiFetch } from './client'
import { resorts as localResorts, type MVCResort } from '../data/resortDatabase'

export async function getResorts(): Promise<MVCResort[]> {
  if (!isApiEnabled) return localResorts
  return apiFetch('/resorts')
}

export async function getResortById(id: string): Promise<MVCResort | undefined> {
  if (!isApiEnabled) return localResorts.find(r => r.id === id)
  return apiFetch(`/resorts/${id}`)
}
