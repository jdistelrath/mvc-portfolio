import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession } from 'amazon-cognito-identity-js'
import { COGNITO_CONFIG } from './cognitoConfig'

const userPool = new CognitoUserPool({
  UserPoolId: COGNITO_CONFIG.userPoolId,
  ClientId: COGNITO_CONFIG.clientId,
})

export interface AuthUser {
  email: string
  role: 'admin' | 'member' | 'viewer'
  name: string
  sub: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ needsNewPassword: boolean }>
  completeNewPassword: (newPassword: string) => Promise<void>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Map email to display name (until we have the DB)
const nameMap: Record<string, string> = {
  'dave@distelrath.com': 'Dave',
  'sarah@distelrath.com': 'Sarah',
  'jim@distelrath.com': 'Jim',
}

function extractUser(session: CognitoUserSession): AuthUser {
  const payload = session.getIdToken().decodePayload()
  const email = payload.email as string
  return {
    email,
    role: (payload['custom:role'] as AuthUser['role']) || 'member',
    name: nameMap[email] || email.split('@')[0],
    sub: payload.sub as string,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Store the Cognito user object for new-password flow
  const [pendingUser, setPendingUser] = useState<CognitoUser | null>(null)
  const [pendingAttrs, setPendingAttrs] = useState<Record<string, string>>({})

  // Check for existing session on mount
  useEffect(() => {
    const cognitoUser = userPool.getCurrentUser()
    if (cognitoUser) {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (!err && session?.isValid()) {
          setUser(extractUser(session))
        }
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ needsNewPassword: boolean }> => {
    setError(null)
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
    const authDetails = new AuthenticationDetails({ Username: email, Password: password })

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          setUser(extractUser(session))
          setPendingUser(null)
          resolve({ needsNewPassword: false })
        },
        onFailure: (err) => {
          setError(err.message || 'Login failed')
          reject(err)
        },
        newPasswordRequired: (userAttributes) => {
          // First login with temporary password
          setPendingUser(cognitoUser)
          // Remove non-writable attributes
          const { email_verified, email: _email, ...attrs } = userAttributes
          void email_verified; void _email
          setPendingAttrs(attrs)
          resolve({ needsNewPassword: true })
        },
      })
    })
  }, [])

  const completeNewPassword = useCallback(async (newPassword: string): Promise<void> => {
    if (!pendingUser) throw new Error('No pending password change')
    setError(null)

    return new Promise((resolve, reject) => {
      pendingUser.completeNewPasswordChallenge(newPassword, pendingAttrs, {
        onSuccess: (session) => {
          setUser(extractUser(session))
          setPendingUser(null)
          setPendingAttrs({})
          resolve()
        },
        onFailure: (err) => {
          setError(err.message || 'Password change failed')
          reject(err)
        },
      })
    })
  }, [pendingUser, pendingAttrs])

  const logout = useCallback(() => {
    const cognitoUser = userPool.getCurrentUser()
    if (cognitoUser) cognitoUser.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isLoading,
      login,
      completeNewPassword,
      logout,
      error,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
