import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Logo } from '../components/ui'

export default function Login() {
  const { needsSetup, setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(undefined)
    if (needsSetup && password !== password2) { setErr('Le due password non coincidono.'); return }
    setBusy(true)
    try {
      const u = needsSetup ? await api.setup(username, displayName, password) : await api.login(username, password, remember)
      setUser(u)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="brand big"><Logo /> Ortol</div>
        <p>L'orto che segue il clima della tua città: cosa piantare, quando annaffiare, quando concimare e quanto raccoglierai.</p>
        <svg className="auth-rows" viewBox="0 0 300 140" aria-hidden="true">
          {[0, 1, 2, 3].map(r => (
            <g key={r} transform={`translate(0 ${r * 34 + 8})`}>
              <rect x="0" y="0" width="300" height="22" rx="4" fill="rgb(255 255 255 / 0.07)" />
              {Array.from({ length: 9 }, (_, i) => (
                <g key={i} transform={`translate(${18 + i * 33} 11)`}>
                  <path d="M0 6V-2M0 1c-4 0-6-3-6-6 3 0 6 2 6 6zM0 -1c0-4 3-7 7-7 0 3-3 7-7 7z" fill="var(--sprout)" opacity={0.5 + ((i + r) % 3) * 0.2} />
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <h1>{needsSetup ? 'Crea l\'account amministratore' : 'Accedi'}</h1>
        <p className="muted">
          {needsSetup
            ? 'È il primo avvio: questo account potrà creare e gestire gli altri utenti.'
            : 'Entra per ritrovare il tuo orto e il registro delle operazioni.'}
        </p>
        <label className="field"><span>Nome utente</span>
          <input className="input" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required autoFocus /></label>
        {needsSetup && (
          <label className="field"><span>Nome visualizzato</span>
            <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Es. Tommaso" /></label>
        )}
        <label className="field"><span>Password</span>
          <input className="input" type="password" autoComplete={needsSetup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={needsSetup ? 8 : undefined} /></label>
        {needsSetup && (
          <label className="field"><span>Ripeti la password</span>
            <input className="input" type="password" autoComplete="new-password" value={password2} onChange={e => setPassword2(e.target.value)} required minLength={8} />
            <small className="muted">Almeno 8 caratteri.</small></label>
        )}
        {!needsSetup && (
          <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Resta collegato su questo dispositivo</label>
        )}
        {err && <div className="error" role="alert">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Attendi…' : needsSetup ? 'Crea account e accedi' : 'Accedi'}</button>
        {!needsSetup && <p className="small muted">Non hai un account? Chiedilo all'amministratore.</p>}
      </form>
    </div>
  )
}
