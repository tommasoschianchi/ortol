import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { api, fmtNum } from '../api'
import { useAuth } from '../auth'
import { Loading } from '../components/ui'
import type { GardenSummary } from '../types'
import NewGarden from './NewGarden'

const LAST = 'ortol-last-garden'
export const rememberGarden = (userId: string, gardenId: string) => { try { localStorage.setItem(`${LAST}:${userId}`, gardenId) } catch { /* storage non disponibile */ } }
const lastGarden = (userId: string) => { try { return localStorage.getItem(`${LAST}:${userId}`) } catch { return null } }

export default function Home() {
  const { user } = useAuth()
  const loc = useLocation()
  const [gardens, setGardens] = useState<GardenSummary[]>()
  const [err, setErr] = useState<string>()
  // "?tutti" mostra l'elenco anche se c'è un solo orto o un orto aperto di recente
  const showAll = new URLSearchParams(loc.search).has('tutti') || (loc.state as { all?: boolean } | null)?.all

  useEffect(() => { api.gardens().then(setGardens).catch(e => setErr(e.message)) }, [])

  if (err) return <div className="wrap" style={{ paddingTop: 40 }}><div className="error">{err}</div></div>
  if (!gardens) return <Loading />

  // Nessun orto: si parte subito con la creazione guidata
  if (gardens.length === 0) return <NewGarden first />

  if (!showAll) {
    const last = user && lastGarden(user.id)
    const target = gardens.find(g => g.id === last) ?? (gardens.length === 1 ? gardens[0] : undefined)
    if (target) return <Navigate to={`/orto/${target.id}`} replace />
  }

  return (
    <div className="wrap">
      <div className="row" style={{ padding: '40px 0 20px' }}>
        <div>
          <h1>I tuoi orti</h1>
          <p className="muted" style={{ marginTop: 8 }}>Ciao {user?.displayName}, scegli quale aprire.</p>
        </div>
        <span className="spacer" />
        <Link to="/nuovo" className="btn sprout">Nuovo orto</Link>
      </div>
      <div className="garden-list">
        {gardens.map(g => (
          <Link key={g.id} to={`/orto/${g.id}`} className="garden-link">
            <h3>{g.cultivation === 'Vaso' ? '🪴' : '🌱'} {g.name}</h3>
            <div className="muted">{[g.city, g.region].filter(Boolean).join(', ')}</div>
            <div className="row small" style={{ marginTop: 14 }}>
              <span className="chip ok">{g.plantCount} {g.plantCount === 1 ? 'coltura' : 'colture'}</span>
              {g.areaSqm ? <span className="chip">{fmtNum(g.areaSqm, 2)} m²</span> : null}
              <span className="chip">{g.cultivation === 'Vaso' ? 'In vaso' : 'In terra'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
