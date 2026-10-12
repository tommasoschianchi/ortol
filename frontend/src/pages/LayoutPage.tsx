import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import LayoutEditor, { type LayoutValue, useLotInfo } from '../components/LayoutEditor'
import { Loading } from '../components/ui'
import type { Dashboard, EditLot, PlantListItem } from '../types'

export default function LayoutPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [d, setD] = useState<Dashboard>()
  const [species, setSpecies] = useState<PlantListItem[]>()
  const [value, setValue] = useState<LayoutValue>()
  const [initial, setInitial] = useState<EditLot[]>([])
  const [err, setErr] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api.dashboard(id), api.plants(id)]).then(([dash, sp]) => {
      setD(dash); setSpecies(sp)
      const lots: EditLot[] = dash.garden.lots.map(l => {
        const crop = dash.plants.find(p => p.lotId === l.id)
        return {
          key: l.id, id: l.id, name: l.name, x: l.x, y: l.y, w: l.w, h: l.h, depthCm: l.depthCm,
          speciesId: crop?.speciesId, cropSpeciesId: crop?.speciesId, cropFitness: crop?.fitness, plantedOn: crop?.plantedOn,
        }
      })
      setInitial(lots)
      setValue({ widthM: dash.garden.widthM, lengthM: dash.garden.lengthM, lots })
    }).catch(e => setErr(e.message))
  }, [id])

  const recommendedNow = useMemo(() => new Set((d?.recommendations ?? []).filter(r => r.timing === 'ora').map(r => r.species.id)), [d])
  const unassigned = d?.plants.filter(p => !p.lotId) ?? []

  if (err && !d) return <div className="wrap" style={{ paddingTop: 40 }}><div className="error">{err}</div></div>
  if (!d || !species || !value) return <Loading text="Carico la mappa dell'orto…" />
  const pot = d.garden.cultivation === 'Vaso'

  const save = async () => {
    // colture che verranno concluse
    const ending = [
      ...value.lots.filter(l => l.cropSpeciesId && l.speciesId !== l.cropSpeciesId).map(l => l.name),
      ...initial.filter(i => i.cropSpeciesId && !value.lots.some(l => l.key === i.key)).map(l => l.name),
    ]
    if (ending.length && !confirm(`Le colture in ${ending.join(', ')} verranno segnate come concluse (il registro resta nello storico). Continuare?`)) return
    setBusy(true); setErr(undefined)
    try {
      await api.saveLayout(id, value.widthM, value.lengthM, value.lots.map(l => ({
        id: l.id, name: l.name, x: l.x, y: l.y, w: l.w, h: l.h, depthCm: l.depthCm, speciesId: l.speciesId, plantedOn: l.plantedOn,
      })))
      nav(`/orto/${id}`)
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <div className="wrap wizard">
      <Link to={`/orto/${id}`} className="linkbtn">Torna all'orto</Link>
      <h1 style={{ marginTop: 10 }}>Disposizione {pot ? 'dei vasi' : 'dell\'orto'}</h1>
      <p className="muted" style={{ margin: '10px 0 18px', maxWidth: '66ch' }}>
        {d.garden.name}, vista dall'alto. Con "Aggiungi coltura" scegli dalla classifica delle piante più adatte al periodo, poi sposta e ridimensiona {pot ? 'i vasi' : 'i lotti'}:
        superficie, piante e raccolto stimato si aggiornano in tempo reale.
      </p>
      {unassigned.length > 0 && (
        <p className="notice" style={{ marginBottom: 12 }}>
          {unassigned.length === 1 ? 'Una coltura non è' : `${unassigned.length} colture non sono`} ancora su un lotto ({unassigned.map(p => p.label ?? p.name).join(', ')}):
          crea un lotto con la stessa specie e concludi la vecchia voce dal cruscotto.
        </p>
      )}
      <LayoutEditor value={value} onChange={setValue} cultivation={d.garden.cultivation} species={species} recommendedNow={recommendedNow} recommendations={d.recommendations} city={d.garden.city} />
      {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
      <SaveBar value={value} d={d} species={species} busy={busy} onSave={save} onCancel={() => nav(`/orto/${id}`)} />
    </div>
  )
}

function SaveBar({ value, d, species, busy, onSave, onCancel }: {
  value: LayoutValue; d: Dashboard; species: PlantListItem[]; busy: boolean; onSave: () => void; onCancel: () => void
}) {
  const { problems } = useLotInfo(value, d.garden.cultivation, species)
  return (
    <div className="stickybar">
      <div className="row">
        <button className="btn ghost" onClick={onCancel}>Annulla</button>
        <span className="spacer" />
        {problems.length > 0 && <span className="small" style={{ color: 'var(--danger)' }}>Correggi le sovrapposizioni per salvare</span>}
        <button className="btn sprout" disabled={busy || problems.length > 0} onClick={onSave}>{busy ? 'Salvo…' : 'Salva disposizione'}</button>
      </div>
    </div>
  )
}
