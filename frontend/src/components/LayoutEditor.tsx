import { useMemo, useState } from 'react'
import { area, defaultDepth, estimatedYield, newKey, overlaps, plantsInLot, potLiters, round2 } from '../agro'
import { fmtNum, todayIso } from '../api'
import type { Cultivation, EditLot, PlantListItem, Recommendation } from '../types'
import AddCropModal from './AddCropModal'
import GardenMap, { type LotInfo } from './GardenMap'
import { FitnessDial } from './ui'

export interface LayoutValue { widthM: number; lengthM: number; lots: EditLot[] }

interface Props {
  value: LayoutValue
  onChange: (v: LayoutValue) => void
  cultivation: Cultivation
  species: PlantListItem[]
  /** Specie consigliate da mettere a dimora adesso. */
  recommendedNow: Set<string>
  /** Consigli di semina del periodo (per la classifica in "Aggiungi coltura"). */
  recommendations: Recommendation[]
  city?: string
}

/** Calcola per ogni lotto piante, resa stimata e validità (sovrapposizioni, confini). */
export function useLotInfo(v: LayoutValue, cultivation: Cultivation, species: PlantListItem[]) {
  return useMemo(() => {
    const byId = new Map(species.map(s => [s.species.id, s]))
    const info: Record<string, LotInfo & { fitness?: number }> = {}
    let kg = 0, used = 0
    const problems: string[] = []
    v.lots.forEach((l, i) => {
      const sp = l.speciesId ? byId.get(l.speciesId) : undefined
      const a = area(l)
      used += a
      const overlap = v.lots.some((o, j) => j !== i && overlaps(l, o))
      const out = l.x + l.w > v.widthM + 0.001 || l.y + l.h > v.lengthM + 0.001
      if (overlap && !problems.some(p => p.includes(l.name))) problems.push(`"${l.name}" si sovrappone a un altro lotto.`)
      if (out) problems.push(`"${l.name}" esce dai confini dell'orto.`)
      const item: LotInfo & { fitness?: number } = { invalid: overlap || out }
      if (sp) {
        item.species = sp.species
        item.plants = plantsInLot(sp.species, l, cultivation)
        item.fitness = sp.fitness ?? 50
        item.kg = estimatedYield(sp.species, a, item.fitness)
        kg += item.kg
      }
      info[l.key] = item
    })
    return { info, kg: Math.round(kg * 10) / 10, used: round2(used), problems }
  }, [v, cultivation, species])
}

export default function LayoutEditor({ value: v, onChange, cultivation, species, recommendedNow, recommendations, city }: Props) {
  const [adding, setAdding] = useState(false)
  const [sel, setSel] = useState<string | null>(v.lots[0]?.key ?? null)
  const [msg, setMsg] = useState<string>()
  const { info, kg, used, problems } = useLotInfo(v, cultivation, species)
  const pot = cultivation === 'Vaso'
  const lot = v.lots.find(l => l.key === sel)
  const byId = useMemo(() => new Map(species.map(s => [s.species.id, s])), [species])

  const setLots = (lots: EditLot[]) => onChange({ ...v, lots })
  const patch = (key: string, p: Partial<EditLot>) => setLots(v.lots.map(l => (l.key === key ? { ...l, ...p } : l)))

  /** Crea il lotto per la coltura scelta nella classifica (o un lotto vuoto). */
  const addCrop = (speciesId: string | null, r: { x: number; y: number; w: number; h: number; depthCm?: number }) => {
    setMsg(undefined); setAdding(false)
    const sp = speciesId ? byId.get(speciesId)?.species : undefined
    const n = v.lots.length + 1
    const base = sp ? (pot ? `Vaso ${sp.name.toLowerCase()}` : sp.name) : pot ? `Vaso ${n}` : `Lotto ${n}`
    let name = base, k = 2
    while (v.lots.some(l => l.name === name)) name = `${base} ${k++}`
    const nl: EditLot = {
      key: newKey(), name, x: r.x, y: r.y, w: r.w, h: r.h,
      depthCm: pot ? r.depthCm ?? 30 : undefined, speciesId: sp?.id, plantedOn: sp ? todayIso() : undefined,
    }
    setLots([...v.lots, nl]); setSel(nl.key)
  }

  const split = (dir: 'v' | 'h') => {
    if (!lot) return
    setMsg(undefined)
    const half = (n: number) => Math.max(0.1, Math.floor((n / 2) * 20) / 20)
    if ((dir === 'v' ? lot.w : lot.h) < 0.2) { setMsg('Il lotto è troppo piccolo per essere diviso.'); return }
    let a: EditLot, b: EditLot
    if (dir === 'v') {
      const w1 = half(lot.w)
      a = { ...lot, w: w1 }
      b = { ...lot, key: newKey(), id: undefined, cropSpeciesId: undefined, speciesId: undefined, name: `${lot.name} B`, x: round2(lot.x + w1), w: round2(lot.w - w1) }
    } else {
      const h1 = half(lot.h)
      a = { ...lot, h: h1 }
      b = { ...lot, key: newKey(), id: undefined, cropSpeciesId: undefined, speciesId: undefined, name: `${lot.name} B`, y: round2(lot.y + h1), h: round2(lot.h - h1) }
    }
    setLots(v.lots.flatMap(l => (l.key === lot.key ? [a, b] : [l])))
    setSel(b.key)
  }

  const remove = () => {
    if (!lot) return
    if (lot.cropSpeciesId && !confirm(`Nel lotto "${lot.name}" c'è una coltura in corso: verrà segnata come conclusa (il registro resta). Eliminare il lotto?`)) return
    setLots(v.lots.filter(l => l.key !== lot.key))
    setSel(null)
  }

  const setDim = (k: 'widthM' | 'lengthM', val: number) => {
    if (!isFinite(val) || val <= 0) return
    onChange({ ...v, [k]: Math.min(200, round2(val)) })
  }

  const sortedSpecies = useMemo(() => [...species].sort((a, b) => (b.fitness ?? 0) - (a.fitness ?? 0)), [species])
  const recList = sortedSpecies.filter(s => recommendedNow.has(s.species.id))
  const otherList = sortedSpecies.filter(s => !recommendedNow.has(s.species.id))
  const total = round2(v.widthM * v.lengthM)

  return (
    <div className="editor">
      <div className="editor-bar">
        <label className="dim-input">
          <span>{pot ? 'Spazio' : 'Orto'}</span>
          <input className="input slim" type="number" step="0.1" min="0.2" max="200" value={v.widthM} aria-label="Larghezza in metri"
            onChange={e => setDim('widthM', Number(e.target.value))} />
          <span>×</span>
          <input className="input slim" type="number" step="0.1" min="0.2" max="200" value={v.lengthM} aria-label="Lunghezza in metri"
            onChange={e => setDim('lengthM', Number(e.target.value))} />
          <span>m</span>
        </label>
        <span className="spacer" />
        <button type="button" className="btn small sprout" onClick={() => setAdding(true)}>Aggiungi coltura</button>
        <button type="button" className="btn small ghost" disabled={!lot} onClick={() => split('v')} title="Divide il lotto selezionato in due, affiancati">Dividi ⟷</button>
        <button type="button" className="btn small ghost" disabled={!lot} onClick={() => split('h')} title="Divide il lotto selezionato in due, uno sopra l'altro">Dividi ↕</button>
        <button type="button" className="btn small ghost" disabled={!lot} onClick={remove}>Elimina</button>
      </div>

      <div className="editor-grid">
        <div>
          <GardenMap widthM={v.widthM} lengthM={v.lengthM} cultivation={cultivation} lots={v.lots} info={info}
            selected={sel} onSelect={setSel}
            onChangeLot={(key, r) => patch(key, r)} />
          <p className="small muted" style={{ marginTop: 8 }}>
            Trascina un {pot ? 'vaso' : 'lotto'} per spostarlo e le maniglie per ridimensionarlo (aggancio a 5 cm).
            Da tastiera: frecce per spostare, Alt + frecce per ridimensionare, Maiuscole per passi di 50 cm.
          </p>
          {msg && <div className="notice" style={{ marginTop: 8 }}>{msg}</div>}
          {problems.length > 0 && <div className="error" style={{ marginTop: 8 }}>{problems.join(' ')}</div>}
        </div>

        <aside className="panel editor-side" aria-live="polite">
          {!lot ? (
            <Summary v={v} pot={pot} total={total} used={used} kg={kg} info={info} onPick={setSel} />
          ) : (
            <LotPanel key={lot.key} lot={lot} pot={pot} info={info[lot.key] ?? {}}
              item={lot.speciesId ? byId.get(lot.speciesId) : undefined}
              recList={recList} otherList={otherList} recommendedNow={recommendedNow}
              onPatch={p => patch(lot.key, p)} onClose={() => setSel(null)} />
          )}
        </aside>
      </div>

      {adding && (
        <AddCropModal cultivation={cultivation} city={city} widthM={v.widthM} lengthM={v.lengthM} lots={v.lots}
          species={species} recommendations={recommendations} onPick={addCrop} onClose={() => setAdding(false)} />
      )}

      <div className="totals" role="status">
        <div><b>{fmtNum(total, 2)} m²</b><span>superficie</span></div>
        <div><b>{fmtNum(used, 2)} m²</b><span>coltivati ({total ? Math.round((used / total) * 100) : 0}%)</span></div>
        <div><b>{v.lots.length}</b><span>{pot ? 'vasi' : 'lotti'}</span></div>
        <div className="hl"><b>~{fmtNum(kg)} kg</b><span>raccolto stimato per ciclo</span></div>
      </div>
    </div>
  )
}

function Summary({ v, pot, total, used, kg, info, onPick }: {
  v: LayoutValue; pot: boolean; total: number; used: number; kg: number; info: Record<string, LotInfo>; onPick: (k: string) => void
}) {
  return (
    <div className="stack">
      <h3>{pot ? 'I tuoi vasi' : 'I tuoi lotti'}</h3>
      <p className="small muted">Seleziona un {pot ? 'vaso' : 'lotto'} sulla mappa o dall'elenco per scegliere la coltura e regolarne le misure.</p>
      {v.lots.length === 0 && <p className="small">Ancora nessuna coltura: premi "Aggiungi coltura" per vedere le piante più adatte a questo periodo.</p>}
      <ul className="lot-list">
        {v.lots.map(l => {
          const i = info[l.key] ?? {}
          return (
            <li key={l.key}>
              <button type="button" onClick={() => onPick(l.key)}>
                <span className="em">{i.species?.emoji ?? '▢'}</span>
                <span className="nm">{l.name}<small>{i.species?.name ?? 'libero'}</small></span>
                <span className="st">{fmtNum(area(l), 2)} m²{i.kg != null && <small>~{fmtNum(i.kg)} kg</small>}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {total > 0 && used / total > 0.85 && !pot && (
        <p className="small muted">Lascia qualche camminamento tra i lotti (30–50 cm) per raggiungere le piante senza calpestare il terreno.</p>
      )}
      <p className="small muted">Resa stimata totale: <b>~{fmtNum(kg)} kg</b> per ciclo, calcolata su superficie, resa media della specie e idoneità al clima.</p>
    </div>
  )
}

function LotPanel({ lot, pot, info, item, recList, otherList, recommendedNow, onPatch, onClose }: {
  lot: EditLot; pot: boolean; info: LotInfo & { fitness?: number }; item?: PlantListItem
  recList: PlantListItem[]; otherList: PlantListItem[]; recommendedNow: Set<string>
  onPatch: (p: Partial<EditLot>) => void; onClose: () => void
}) {
  const sp = item?.species
  const a = area(lot)
  const changingCrop = !!lot.cropSpeciesId && lot.speciesId !== lot.cropSpeciesId
  const isNewCrop = !!lot.speciesId && lot.speciesId !== lot.cropSpeciesId
  const warnings: string[] = []
  if (sp && pot) {
    const liters = potLiters(lot)
    const depth = lot.depthCm ?? 30
    if (depth < sp.container.minDepthCm) warnings.push(`Profondità insufficiente: ${sp.name.toLowerCase()} vuole almeno ${sp.container.minDepthCm} cm.`)
    if (liters < sp.container.minLiters) warnings.push(`Vaso troppo piccolo: servono almeno ${sp.container.minLiters} L di terriccio per pianta (ora ${fmtNum(liters)} L).`)
    if (sp.container.suitability === 'Sconsigliata') warnings.push(`Coltura sconsigliata in vaso. ${sp.container.notes}`)
  }
  if (sp && !pot && a < (sp.spacingRowCm * sp.spacingPlantCm) / 10000) warnings.push('Il lotto è più piccolo del sesto d\'impianto di una pianta.')
  if (isNewCrop && sp && !recommendedNow.has(sp.id)) warnings.push('Non è il periodo consigliato per mettere a dimora questa specie nella tua zona: il raccolto potrebbe essere scarso.')

  const num = (v: string) => Math.max(0.1, round2(Number(v) || 0))
  const label = (s: PlantListItem) => `${s.species.emoji} ${s.species.name} — ${s.fitness ?? '–'}/100${pot && s.species.container.suitability === 'Sconsigliata' ? ' (sconsigliata in vaso)' : ''}`

  return (
    <div className="stack">
      <div className="row">
        <input className="input name-input" value={lot.name} onChange={e => onPatch({ name: e.target.value })} aria-label="Nome del lotto" />
        <button type="button" className="linkbtn" onClick={onClose}>Chiudi</button>
      </div>

      <label className="field"><span>Coltura</span>
        <select className="input" value={lot.speciesId ?? ''} onChange={e => {
          const id = e.target.value || undefined
          const p: Partial<EditLot> = { speciesId: id }
          if (id && id !== lot.cropSpeciesId) p.plantedOn = lot.plantedOn && !lot.cropSpeciesId ? lot.plantedOn : todayIso()
          const all = [...recList, ...otherList]
          const s = all.find(x => x.species.id === id)
          // se il nome del lotto era quello della coltura precedente, segue la nuova coltura
          const prev = all.find(x => x.species.id === lot.speciesId)?.species.name
          if (prev && s && (lot.name === prev || lot.name === `Vaso ${prev.toLowerCase()}`))
            p.name = lot.name === prev ? s.species.name : `Vaso ${s.species.name.toLowerCase()}`
          if (pot && s && (lot.depthCm ?? 0) < s.species.container.minDepthCm) p.depthCm = defaultDepth(s.species)
          onPatch(p)
        }}>
          <option value="">Libero (nessuna coltura)</option>
          {recList.length > 0 && <optgroup label="Da piantare adesso">{recList.map(s => <option key={s.species.id} value={s.species.id}>{label(s)}</option>)}</optgroup>}
          <optgroup label={recList.length ? 'Altre specie' : 'Specie'}>{otherList.map(s => <option key={s.species.id} value={s.species.id}>{label(s)}</option>)}</optgroup>
        </select>
      </label>
      {changingCrop && (
        <p className="notice">La coltura attuale ({[...recList, ...otherList].find(x => x.species.id === lot.cropSpeciesId)?.species.name ?? lot.cropSpeciesId}) verrà segnata come conclusa al salvataggio. Il suo registro resta nello storico.</p>
      )}

      <div className="form-grid tight">
        <label className="field"><span>Larghezza (m)</span><input className="input" type="number" step="0.05" min="0.1" value={lot.w} onChange={e => onPatch({ w: num(e.target.value) })} /></label>
        <label className="field"><span>Lunghezza (m)</span><input className="input" type="number" step="0.05" min="0.1" value={lot.h} onChange={e => onPatch({ h: num(e.target.value) })} /></label>
        {pot && <label className="field"><span>Profondità (cm)</span><input className="input" type="number" step="5" min="5" max="150" value={lot.depthCm ?? 30} onChange={e => onPatch({ depthCm: Math.max(5, Math.min(150, Number(e.target.value) || 30)) })} /></label>}
        {isNewCrop && <label className="field"><span>Messa a dimora</span><input className="input" type="date" value={lot.plantedOn ?? todayIso()} onChange={e => onPatch({ plantedOn: e.target.value })} /></label>}
      </div>

      <div className="live">
        <div><b>{fmtNum(a, 2)} m²</b><span>superficie</span></div>
        {pot && <div><b>{fmtNum(potLiters(lot), 0)} L</b><span>terriccio</span></div>}
        {sp && <div><b>{info.plants}</b><span>{info.plants === 1 ? 'pianta' : 'piante'}</span></div>}
        {sp && <div className="hl"><b>~{fmtNum(info.kg ?? 0)} kg</b><span>raccolto stimato</span></div>}
      </div>
      {sp && (
        <div className="row small" style={{ gap: 10 }}>
          <FitnessDial score={info.fitness ?? 0} size={40} />
          <span className="muted">
            Idoneità al clima{pot ? ' in vaso' : ''}. Resa media {fmtNum(sp.yieldKgM2)} kg/m², sesto {sp.spacingRowCm}×{sp.spacingPlantCm} cm
            {pot ? `, ${sp.container.minLiters} L per pianta` : ''}.
          </span>
        </div>
      )}
      {warnings.map(w => <p key={w} className="notice">{w}</p>)}
    </div>
  )
}
