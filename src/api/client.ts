import { API_BASE_URL } from '../config'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`

  // TODO Phase 2: inject Cognito JWT here
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    throw new ApiError(res.status, await res.text())
  }
  return res.json()
}
