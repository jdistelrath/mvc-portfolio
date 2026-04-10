import { API_BASE_URL } from '../config'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { COGNITO_CONFIG } from '../auth/cognitoConfig'

const userPool = new CognitoUserPool({
  UserPoolId: COGNITO_CONFIG.userPoolId,
  ClientId: COGNITO_CONFIG.clientId,
})

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getIdToken(): string | null {
  const user = userPool.getCurrentUser()
  if (!user) return null
  let token: string | null = null
  user.getSession((err: Error | null, session: { isValid: () => boolean; getIdToken: () => { getJwtToken: () => string } } | null) => {
    if (!err && session?.isValid()) {
      token = session.getIdToken().getJwtToken()
    }
  })
  return token
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  }

  // Inject Cognito JWT
  const token = getIdToken()
  if (token) {
    headers['Authorization'] = token
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    throw new ApiError(res.status, await res.text())
  }
  return res.json()
}
