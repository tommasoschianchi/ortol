import { useCallback, useEffect, useState } from 'react'
import { api, fmtDate } from '../api'
import { useAuth } from '../auth'
import { Loading, Modal } from '../components/ui'
import type { AdminUser, UserRole } from '../types'

export default function Admin() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>()
  const [err, setErr] = useState<string>()
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState<AdminUser>()

  const load = useCallback(() => api.users().then(setUsers).catch(e => setErr(e.message)), [])
  useEffect(() => { load() }, [load])

  const run = async (f: () => Promise<unknown>) => {
    setErr(undefined)
    try { await f(); await load() } catch (e) { setErr((e as Error).message) }
  }

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="row" style={{ padding: '40px 0 20px' }}>
        <div>
          <h1>Utenti</h1>
          <p className="muted" style={{ marginTop: 8 }}>Crea gli account, reimposta le password e decidi chi può amministrare.</p>
        </div>
        <span className="spacer" />
        <button className="btn sprout" onClick={() => setCreating(true)}>Nuovo utente</button>
      </div>
      {err && <div className="error" role="alert" style={{ marginBottom: 14 }}>{err}</div>}
      {!users && !err && <Loading />}
      {users && (
        <div className="table-wrap panel" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr><th>Utente</th><th>Ruolo</th><th>Orti</th><th>Colture</th><th>Operazioni</th><th>Ultimo accesso</th><th>Stato</th><th /></tr>
            </thead>
            <tbody>
              {users.map(u => {
                const self = u.id === me?.id
                return (
                  <tr key={u.id} className={u.disabled ? 'off' : ''}>
                    <td><b>{u.displayName}</b><div className="small muted">{u.username}{self && ' · tu'}</div></td>
                    <td>
                      <select className="input slim" value={u.role} disabled={self} aria-label={`Ruolo di ${u.username}`}
                        onChange={e => run(() => api.updateUser(u.id, { role: e.target.value as UserRole }))}>
                        <option value="User">Utente</option>
                        <option value="Admin">Amministratore</option>
                      </select>
                    </td>
                    <td>{u.gardens}</td>
                    <td>{u.crops}</td>
                    <td>{u.logs}</td>
                    <td className="small">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'mai'}</td>
                    <td>{u.disabled ? <span className="chip harvest">Disattivato</span> : <span className="chip ok">Attivo</span>}</td>
                    <td className="actions">
                      <button className="linkbtn" onClick={() => setResetting(u)}>Nuova password</button>
                      {!self && <button className="linkbtn" onClick={() => run(() => api.updateUser(u.id, { disabled: !u.disabled }))}>{u.disabled ? 'Riattiva' : 'Disattiva'}</button>}
                      {!self && <button className="linkbtn danger" onClick={() => {
                        if (confirm(`Eliminare l'utente ${u.username}? Verranno eliminati anche i suoi ${u.gardens} orti e tutto lo storico.`))
                          run(() => api.deleteUser(u.id))
                      }}>Elimina</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {creating && <CreateUser onClose={() => setCreating(false)} onDone={() => { setCreating(false); load() }} />}
      {resetting && <ResetPassword user={resetting} onClose={() => setResetting(undefined)} onDone={() => { setResetting(undefined); load() }} />}
    </div>
  )
}

function CreateUser({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('User')
  const [err, setErr] = useState<string>()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(undefined)
    try { await api.createUser({ username, displayName, password, role }); onDone() } catch (e) { setErr((e as Error).message) }
  }
  return (
    <Modal onClose={onClose} label="Nuovo utente">
      <form onSubmit={submit} className="stack">
        <h2>Nuovo utente</h2>
        <div className="form-grid">
          <label className="field"><span>Nome utente</span><input className="input" value={username} onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="off" /></label>
          <label className="field"><span>Nome visualizzato</span><input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} /></label>
          <label className="field"><span>Password iniziale</span><input className="input" type="text" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="off" />
            <small className="muted">Almeno 8 caratteri. Comunicala all'utente: potrà cambiarla dal suo profilo.</small></label>
          <label className="field"><span>Ruolo</span>
            <select className="input" value={role} onChange={e => setRole(e.target.value as UserRole)}>
              <option value="User">Utente</option><option value="Admin">Amministratore</option>
            </select></label>
        </div>
        {err && <div className="error" role="alert">{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>Annulla</button>
          <button className="btn">Crea utente</button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPassword({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string>()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(undefined)
    try { await api.updateUser(user.id, { password }); onDone() } catch (e) { setErr((e as Error).message) }
  }
  return (
    <Modal onClose={onClose} label="Nuova password">
      <form onSubmit={submit} className="stack">
        <h2>Nuova password per {user.displayName}</h2>
        <p className="muted small">Le sessioni aperte dall'utente verranno chiuse.</p>
        <label className="field"><span>Nuova password</span><input className="input" type="text" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus autoComplete="off" /></label>
        {err && <div className="error" role="alert">{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>Annulla</button>
          <button className="btn">Imposta password</button>
        </div>
      </form>
    </Modal>
  )
}

export function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [next2, setNext2] = useState('')
  const [err, setErr] = useState<string>()
  const [done, setDone] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(undefined)
    if (next !== next2) { setErr('Le due password non coincidono.'); return }
    try { await api.changePassword(current, next); setDone(true) } catch (e) { setErr((e as Error).message) }
  }
  return (
    <Modal onClose={onClose} label="Cambia password">
      <form onSubmit={submit} className="stack">
        <h2>Cambia password</h2>
        {done ? (
          <>
            <p>Password aggiornata. Le altre sessioni aperte sono state chiuse.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn" onClick={onClose}>Chiudi</button></div>
          </>
        ) : (
          <>
            <label className="field"><span>Password attuale</span><input className="input" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus /></label>
            <label className="field"><span>Nuova password</span><input className="input" type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} /></label>
            <label className="field"><span>Ripeti la nuova password</span><input className="input" type="password" autoComplete="new-password" value={next2} onChange={e => setNext2(e.target.value)} required minLength={8} /></label>
            {err && <div className="error" role="alert">{err}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={onClose}>Annulla</button>
              <button className="btn">Salva</button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
