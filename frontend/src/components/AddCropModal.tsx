import { Fragment, useMemo, useState } from 'react'
import { area, estimatedYield, plantsInLot, proposeLot } from '../agro'
import { fmtDate, fmtNum } from '../api'
import type { Cultivation, EditLot, PlantListItem, Recommendation } from '../types'
import { FitnessDial, Modal, SeasonLegend, SeasonStrip } from './ui'

type Rect = { x: number; y: number; w: number; h: number }

interface Props {
  cultivation: Cultivation
  city?: string
  widthM: number
  lengthM: number
  lots: Rect[]
  species: PlantListItem[]
  recommendations: Recommendation[]
  onPick: (speciesId: string | null, lot: Rect & { depthCm?: number }) => void
  onClose: () => void
}

const nowText: Record<string, string> = { Ideale: 'Periodo ideale', Possibile: 'Periodo possibile', ConProtezione: 'Solo con protezione' }
const statusRank: Record<string, number> = { Ideale: 3, Possibile: 2, ConProtezione: 1 }

interface Row {
  item: PlantListItem
  rec?: Recommendation
  fitness: number
  proposal: (Rect & { depthCm?: number }) | null
  plants: number
  kg: number
}

type Filter = 'tutte' | 'ora'

/** Priorità del periodo: 4 ideale ora, 3 possibile ora, 2 ora con protezione, 1 tra poche settimane, 0 fuori stagione. */
const periodRank = (r: Row) => r.rec?.timing === 'ora' ? 1 + (statusRank[r.rec.status] ?? 0) : r.rec?.timing === 'presto' ? 1 : 0
const periodGroup: Record<number, string> = {
  4: 'Periodo ideale: da piantare adesso',
  3: 'Periodo possibile adesso',
  2: 'Adesso, ma con protezione',
  1: 'Tra poche settimane',
  0: 'Fuori stagione',
}

/**
 * Classifica di tutte le specie dalla più alla meno adatta a una messa a dimora oggi (idoneità 0–100: meteo attuale e previsto,
 * poi medie climatiche della città fino al raccolto),
 * con il calendario di semina di ciascuna e l'indicazione se si possono mettere a dimora adesso.
 */
export default function AddCropModal({ cultivation, city, widthM, lengthM, lots, species, recommendations, onPick, onClose }: Props) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('tutte')
  const pot = cultivation === 'Vaso'
  const month = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(new Date())
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

  const rows = useMemo(() => {
    const recById = new Map(recommendations.map(r => [r.species.id, r]))
    return species.map<Row>(item => {
      const rec = recById.get(item.species.id)
      const fitness = item.fitness ?? rec?.fitness ?? 0
      const proposal = proposeLot(item.species, cultivation, widthM, lengthM, lots)
      const fake: EditLot = { key: 'p', name: '', x: 0, y: 0, w: proposal?.w ?? 1, h: proposal?.h ?? 1, depthCm: proposal?.depthCm }
      return { item, rec, fitness, proposal, plants: plantsInLot(item.species, fake, cultivation), kg: estimatedYield(item.species, area(fake), fitness) }
    })
      // prima il periodo (ideale → possibile → con protezione → tra poco → fuori stagione), poi l'idoneità se piantata oggi
      .sort((a, b) => periodRank(b) - periodRank(a) || b.fitness - a.fitness || a.item.species.name.localeCompare(b.item.species.name))
  }, [species, recommendations, cultivation, widthM, lengthM, lots])

  const shown = rows.filter(r =>
    (filter === 'tutte' || (r.rec?.timing === 'ora' && r.rec.status !== 'ConProtezione'))
    && (!q || `${r.item.species.name} ${r.item.species.scientificName} ${r.item.species.category}`.toLowerCase().includes(q.toLowerCase())))
  const nowCount = rows.filter(r => r.rec?.timing === 'ora' && r.rec.status !== 'ConProtezione').length

  const emptyLot = proposeLot({ spacingRowCm: 100, spacingPlantCm: 25, container: { minLiters: 10, minDepthCm: 30 } } as PlantListItem['species'], cultivation, widthM, lengthM, lots)

  return (
    <Modal onClose={onClose} label="Aggiungi coltura">
      <div className="addcrop">
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <div style={{ flex: 1 }}>
            <h2>Aggiungi coltura</h2>
            <p className="muted small" style={{ marginTop: 6 }}>
              Tutte le piante{city ? ` per ${city}` : ''}{pot ? ' in vaso' : ''}: prima quelle nel periodo ideale per la semina, poi le altre; in ogni gruppo dalla più adatta alla meno adatta. L'idoneità vale per una messa a dimora oggi: temperature di questi giorni, previsioni e clima atteso fino al raccolto.
              Il mese attuale ({month}) è riquadrato. Scegline una: creo {pot ? 'un vaso' : 'un lotto'} della misura giusta nel primo spazio libero.
            </p>
          </div>
          <button type="button" className="linkbtn" onClick={onClose}>Chiudi</button>
        </div>

        <div className="row">
          <input className="input" style={{ flex: '1 1 200px' }} placeholder="Cerca una pianta" value={q} onChange={e => setQ(e.target.value)} aria-label="Cerca una pianta" />
          <div className="filters" role="group" aria-label="Filtro" style={{ margin: 0 }}>
            <button type="button" aria-pressed={filter === 'tutte'} onClick={() => setFilter('tutte')}>Tutte ({rows.length})</button>
            <button type="button" aria-pressed={filter === 'ora'} onClick={() => setFilter('ora')}>Da piantare ora ({nowCount})</button>
          </div>
        </div>
        <SeasonLegend />

        {shown.length === 0 && <p className="notice">{filter === 'ora' && !q ? `A ${month} nessuna specie si può mettere a dimora ${pot ? 'in vaso all\'aperto' : 'in piena aria'} con buone probabilità di raccolto.` : 'Nessuna pianta corrisponde alla ricerca.'}</p>}

        <ol className="rank">
          {shown.map((r, idx) => {
            const grp = periodRank(r)
            const header = idx === 0 || periodRank(shown[idx - 1]) !== grp
              ? <li className={`rank-head g${grp}`}><h3>{periodGroup[grp]}</h3></li>
              : null
            const s = r.item.species
            const t = s.temperature
            const pos = rows.indexOf(r) + 1
            const cal = r.item.calendar ?? r.rec?.calendar
            const now = r.rec?.timing === 'ora'
            return (
              <Fragment key={s.id}>
              {header}
              <li className={now ? 'is-now' : ''}>
                <span className="pos" aria-label={`Posizione ${pos}`}>{pos}</span>
                <span className="em" aria-hidden="true">{s.emoji}</span>
                <div className="info">
                  <div className="row" style={{ gap: 8 }}>
                    <b>{s.name}</b>
                    {now && <span className={`chip${r.rec!.status === 'Ideale' ? ' ok' : ''}`}>{nowText[r.rec!.status] ?? 'Da piantare ora'}</span>}
                    {now && <WindowBadge rec={r.rec!} today={today} />}
                    {r.rec?.timing === 'presto' && <span className="chip">Tra poche settimane</span>}
                    {!r.rec && <span className="chip off">Non è il periodo</span>}
                    {pot && s.container.suitability !== 'Ottima' && <span className="chip">In vaso: {s.container.suitability.toLowerCase()}</span>}
                  </div>
                  <div className="facts-line">
                    <span className="fact" title="Temperature medie dell'aria adatte alla pianta">
                      🌡️ min <b>{fmtNum(t.growthMin)}°</b> · ottimale <b>{fmtNum(t.optMin)}–{fmtNum(t.optMax)}°</b> · max <b>{fmtNum(t.growthMax)}°</b>
                      <span className="muted"> · {s.frostTender ? 'non sopporta il gelo' : `resiste fino a ${fmtNum(t.minSurvival)}°`}</span>
                    </span>
                    <span className="fact" title={`Resa media della specie ${fmtNum(s.yieldKgM2)} kg/m², corretta per l'idoneità se piantata oggi (${r.fitness}/100)`}>
                      ⚖️ resa <b>~{fmtNum(estimatedYield(s, 1, r.fitness))} kg/m²</b><span className="muted"> se piantata oggi (media {fmtNum(s.yieldKgM2)})</span>
                    </span>
                    <span className="fact">⏱️ primo raccolto {harvestIn(r)}{overwinters(r.rec, today) ? <span className="muted"> · semina autunnale, raccolto in primavera</span>
                      : r.rec?.slowFactor && r.rec.slowFactor > 1.5 ? <span className="muted"> · ciclo più lungo del solito per il freddo (tipico ~{r.item.species.daysToMaturity} giorni)</span> : null}</span>
                  </div>
                  {cal && <div className="strip"><SeasonStrip calendar={cal} labels /></div>}
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {r.proposal
                      ? <>{pot ? 'Vaso' : 'Lotto'} iniziale {fmtNum(r.proposal.w, 2)} × {fmtNum(r.proposal.h, 2)} m ({r.plants} {r.plants === 1 ? 'pianta' : 'piante'}), poi lo ridimensioni sulla mappa</>
                      : <span style={{ color: 'var(--danger)' }}>Nessuno spazio libero sufficiente</span>}
                  </div>
                </div>
                <FitnessDial score={r.fitness} label={r.item.fitnessLabel} size={48} note={r.item.fitnessNote ?? r.rec?.fitnessNote} />
                <button type="button" className={`btn small ${now ? 'sprout' : 'ghost'}`} disabled={!r.proposal} onClick={() => r.proposal && onPick(s.id, r.proposal)}>Aggiungi</button>
              </li>
              </Fragment>
            )
          })}
        </ol>

        <div className="addcrop-empty">
          <span className="small muted">Preferisci decidere dopo?</span>
          <button type="button" className="btn ghost small" disabled={!emptyLot} onClick={() => emptyLot && onPick(null, emptyLot)}>
            Aggiungi {pot ? 'un vaso vuoto' : 'un lotto vuoto'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Tempo fino al primo raccolto: dalla simulazione sul clima locale se disponibile, altrimenti il valore nominale della specie. */
function harvestIn(r: Row) {
  if (r.rec?.expectedHarvest) {
    const [y, m, d] = r.rec.expectedHarvest.split('-').map(Number)
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const days = Math.round((new Date(y, m - 1, d).getTime() - now.getTime()) / 86400000)
    return <>tra <b>{span(days)}</b> · {fmtDate(r.rec.expectedHarvest)}{r.rec.timing === 'presto' ? ' (piantando quando consigliato)' : ''}</>
  }
  return <>circa <b>{span(r.item.species.daysToMaturity)}</b> dalla messa a dimora, nel periodo giusto</>
}

function span(days: number) {
  if (days < 60) return `${days} giorni`
  if (days < 120) return `${Math.round(days / 7)} settimane`
  return `${Math.round(days / 30.4)} mesi`
}

/** Quanto resta aperta la finestra di semina senza protezione. */
function WindowBadge({ rec, today }: { rec: Recommendation; today: string }) {
  if (!rec.openUntil || rec.status === 'ConProtezione') return null
  const days = Math.round((Date.parse(rec.openUntil) - Date.parse(today)) / 86400000)
  const idealDays = rec.idealUntil ? Math.round((Date.parse(rec.idealUntil) - Date.parse(today)) / 86400000) : null
  if (days <= 0) return <span className="chip urgent" title="Da domani servirà una protezione">⏳ Ultimo giorno utile</span>
  if (days <= 14) return <span className="chip urgent" title={`Semina entro il ${fmtDate(rec.openUntil)}`}>⏳ Ancora {days} {days === 1 ? 'giorno' : 'giorni'}</span>
  if (rec.status === 'Ideale' && idealDays != null && idealDays <= 14)
    return <span className="chip" title="Poi il periodo resta possibile ma non più ideale">Ideale ancora {idealDays <= 0 ? 'solo oggi' : `${idealDays} giorni`}</span>
  return <span className="chip" title="Ultimo giorno utile senza protezione">fino al {fmtDate(rec.openUntil)}</span>
}

/** Semina autunnale che passa l'inverno e si raccoglie l'anno dopo, tra febbraio e luglio. */
function overwinters(rec: Recommendation | undefined, today: string) {
  if (!rec?.expectedHarvest || rec.timing !== 'ora') return false
  const [hy, hm] = rec.expectedHarvest.split('-').map(Number)
  return hy > Number(today.slice(0, 4)) && hm >= 2 && hm <= 7
}
