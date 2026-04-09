import { useState } from 'react'
import { useAuth } from './AuthProvider'

export default function LoginPage() {
  const { login, completeNewPassword, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [needsNewPassword, setNeedsNewPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLocalError('')
    try {
      const result = await login(email, password)
      if (result.needsNewPassword) {
        setNeedsNewPassword(true)
      }
    } catch {
      // error is set in AuthProvider
    } finally {
      setLoading(false)
    }
  }

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setLocalError('')
    try {
      await completeNewPassword(newPassword)
    } catch {
      // error is set in AuthProvider
    } finally {
      setLoading(false)
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">MVC Portfolio</h1>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold inline-block mt-2"
            style={{ background: 'var(--gold)', color: 'var(--gold-text)' }}>
            Chairman's Club
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {!needsNewPassword ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
              <p className="text-sm text-gray-500 mb-5">Enter your email and password to continue.</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required autoFocus autoComplete="email"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                {displayError && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{displayError}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Set new password</h2>
              <p className="text-sm text-gray-500 mb-5">Your temporary password has expired. Choose a new one.</p>
              <form onSubmit={handleNewPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">New password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    required autoFocus autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    required autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                {displayError && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{displayError}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {loading ? 'Setting password...' : 'Set password & sign in'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Distelrath Family Portfolio Management
        </p>
      </div>
    </div>
  )
}
