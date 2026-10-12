import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, authEvents } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  needsSetup: boolean
  ready: boolean
  error?: string
  refresh: () => Promise<void>
  setUser: (u: User | null) => void
  logout: () => Promise<void>
}

const Ctx = createContext<AuthState>(null!)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    try {
      const s = await api.status()
      setUser(s.user ?? null); setNeedsSetup(s.needsSetup); setError(undefined)
    } catch (e) {
      setError((e as Error).message)
    } finally { setReady(true) }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const h = () => setUser(null)
    authEvents.addEventListener('unauthorized', h)
    return () => authEvents.removeEventListener('unauthorized', h)
  }, [])

  const logout = async () => { await api.logout().catch(() => {}); setUser(null) }

  return <Ctx.Provider value={{ user, needsSetup, ready, error, refresh, setUser: u => { setUser(u); if (u) setNeedsSetup(false) }, logout }}>{children}</Ctx.Provider>
}
