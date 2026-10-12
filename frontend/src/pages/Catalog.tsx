import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { FitnessDial, Loading } from '../components/ui'
import type { PlantListItem } from '../types'

export default function Catalog() {
  const { id } = useParams()
  const [items, setItems] = useState<PlantListItem[]>()
  const [err, setErr] = useState<string>()
  const [cat, setCat] = useState('Tutte')
  const [q, setQ] = useState('')

  useEffect(() => { api.plants(id).then(setItems).catch(e => setErr(e.message)) }, [id])

  const cats = useMemo(() => ['Tutte', ...new Set((items ?? []).map(i => i.species.category))], [items])
  const shown = useMemo(() => (items ?? [])
    .filter(i => cat === 'Tutte' || i.species.category === cat)
    .filter(i => !q || (i.species.name + ' ' + i.species.scientificName).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.fitness ?? 0) - (a.fitness ?? 0) || a.species.name.localeCompare(b.species.name)), [items, cat, q])

  return (
    <div className="wrap">
      <div style={{ padding: '40px 0 4px' }}>
        <h1>Le piante dell'orto</h1>
        <p className="muted" style={{ maxWidth: '62ch', marginTop: 10 }}>
          {id ? 'Ordinate per idoneità se messe a dimora oggi nel tuo orto. ' : 'Apri un orto per vedere l\'idoneità di ogni specie se piantata oggi. '}
          Ogni scheda riporta soglie termiche, coefficienti colturali FAO-56, fabbisogni nutritivi e consociazioni.
        </p>
      </div>
      <div className="row">
        <div className="filters" role="group" aria-label="Categoria">
          {cats.map(c => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <span className="spacer" />
        <input className="input" style={{ maxWidth: 240 }} placeholder="Cerca" value={q} onChange={e => setQ(e.target.value)} aria-label="Cerca pianta" />
      </div>
      {err && <div className="error">{err}</div>}
      {!items && !err && <Loading />}
      <div className="cat-grid">
        {shown.map(i => (
          <Link key={i.species.id} to={id ? `/orto/${id}/piante/${i.species.id}` : `/piante/${i.species.id}`} className="cat-item">
            <span className="emoji" aria-hidden="true">{i.species.emoji}</span>
            <div>
              <b>{i.species.name}</b>
              <div><em className="sci small">{i.species.scientificName}</em></div>
              <div className="small muted">{i.species.family} · {i.species.yieldKgM2.toLocaleString('it-IT')} kg/m² · in vaso: {i.species.container.suitability.toLowerCase()}</div>
            </div>
            {i.fitness != null && <FitnessDial score={i.fitness} label={i.fitnessLabel} size={44} note={i.fitnessNote} />}
          </Link>
        ))}
        {items && shown.length === 0 && <p className="muted">Nessuna pianta corrisponde alla ricerca.</p>}
      </div>
    </div>
  )
}
