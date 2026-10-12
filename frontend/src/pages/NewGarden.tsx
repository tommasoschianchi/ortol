import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { autoLayout } from '../agro'
import { api, doyToDate, fmtDate, SOILS, todayIso } from '../api'
import { useAuth } from '../auth'
import LayoutEditor, { type LayoutValue, useLotInfo } from '../components/LayoutEditor'
import { CitySearch, ClimateChart, FitnessDial, Loading, SeasonLegend, SeasonStrip } from '../components/ui'
import type { Cultivation, GeoResult, Recommendation, SoilType, SuggestionsResponse } from '../types'

const statusText: Record<string, string> = { Ideale: 'Periodo ideale', Possibile: 'Periodo possibile', ConProtezione: 'Con protezione' }

export default function NewGarden({ first = false }: { first?: boolean }) {
  const nav = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [place, setPlace] = useState<GeoResult>()
  const [cultivation, setCultivation] = useState<Cultivation>('Terra')
  const [soil, setSoil] = useState<SoilType>('MedioImpasto')
  const [dims, setDims] = useState({ Terra: { w: 6, l: 4 }, Vaso: { w: 3, l: 1.2 } })
  const [sugg, setSugg] = useState<SuggestionsResponse>()
  const [suggKey, setSuggKey] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [layout, setLayout] = useState<LayoutValue>()
  const [skipped, setSkipped] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>()

  const d = dims[cultivation]
  const key = place ? `${place.latitude},${place.longitude},${cultivation}` : ''

  const goSuggestions = async () => {
    if (!place) return
    setStep(2); setErr(undefined)
    if (sugg && suggKey === key) return
    setSugg(undefined); setPicked([]); setLayout(undefined)
    try { setSugg(await api.suggestions(place.latitude, place.longitude, place.elevation, cultivation)); setSuggKey(key) }
    catch (e) { setErr((e as Error).message) }
  }

  const goLayout = () => {
    if (!sugg) return
    const picks = picked.map(id => sugg.all.find(a => a.species.id === id)!.species)
    const r = autoLayout(d.w, d.l, picks, cultivation, todayIso())
    setLayout({ widthM: d.w, lengthM: d.l, lots: r.lots })
    setSkipped(r.skipped)
    setStep(3)
  }

  const create = async () => {
    if (!place || !layout) return
    setBusy(true); setErr(undefined)
    try {
      const g = await api.createGarden({
        name: name.trim() || (cultivation === 'Vaso' ? `Balcone a ${place.name}` : `Orto a ${place.name}`),
        city: place.name, region: place.region, country: place.country,
        latitude: place.latitude, longitude: place.longitude, elevation: place.elevation, soil, cultivation,
        widthM: layout.widthM, lengthM: layout.lengthM,
        lots: layout.lots.map(l => ({ name: l.name, x: l.x, y: l.y, w: l.w, h: l.h, depthCm: l.depthCm, speciesId: l.speciesId, plantedOn: l.plantedOn })),
      })
      nav(`/orto/${g.id}`, { replace: true })
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  const recs = sugg?.recommendations ?? []
  const now = useMemo(() => recs.filter(r => r.timing === 'ora' && r.status !== 'ConProtezione'), [recs])
  const prot = useMemo(() => recs.filter(r => r.timing === 'ora' && r.status === 'ConProtezione'), [recs])
  const soon = useMemo(() => recs.filter(r => r.timing === 'presto'), [recs])
  const recommendedNow = useMemo(() => new Set(recs.filter(r => r.timing === 'ora').map(r => r.species.id)), [recs])
  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  const pot = cultivation === 'Vaso'

  return (
    <div className="wrap wizard">
      {first ? (
        <>
          <h1>Benvenuto{user ? `, ${user.displayName}` : ''}. Creiamo il tuo orto.</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: '62ch' }}>Dimmi dove si trova e com'è fatto: ti propongo le piante adatte alla stagione e al clima della tua città, poi le disponiamo insieme sulla mappa.</p>
        </>
      ) : <h1>Nuovo orto</h1>}
      <ol className="steps">
        <li className={step >= 1 ? 'on' : ''}><span className="n">1</span><span className="lbl">Dove e come</span></li>
        <li className={step >= 2 ? 'on' : ''}><span className="n">2</span><span className="lbl">Cosa piantare</span></li>
        <li className={step >= 3 ? 'on' : ''}><span className="n">3</span><span className="lbl">Disposizione</span></li>
      </ol>

      {step === 1 && (
        <div className="form-grid">
          <label className="field full">
            <span>Città o comune</span>
            <CitySearch onPick={g => setPlace(g)} initial={place?.name} />
            {place && <div className="small muted" style={{ marginTop: 6 }}>{[place.region, place.country].filter(Boolean).join(', ')} · lat {place.latitude.toFixed(2)}, lon {place.longitude.toFixed(2)}{place.elevation != null && ` · ${Math.round(place.elevation)} m s.l.m.`}</div>}
          </label>

          <div className="full">
            <span className="lbl-strong">Tipo di coltivazione</span>
            <div className="soil-opts two">
              <button type="button" className="soil-opt big" aria-pressed={cultivation === 'Terra'} onClick={() => setCultivation('Terra')}>
                <b>🌱 In piena terra</b><small>Orto in giardino o in campagna. Le radici esplorano il suolo in profondità.</small>
              </button>
              <button type="button" className="soil-opt big" aria-pressed={cultivation === 'Vaso'} onClick={() => setCultivation('Vaso')}>
                <b>🪴 In vaso</b><small>Balcone o terrazzo, con vasi e fioriere. Più acqua e concime, specie compatte.</small>
              </button>
            </div>
          </div>

          <label className="field">
            <span>{pot ? 'Spazio disponibile: larghezza (m)' : 'Larghezza dell\'orto (m)'}</span>
            <input className="input" type="number" min="0.2" max="200" step="0.1" value={d.w}
              onChange={e => setDims(x => ({ ...x, [cultivation]: { ...d, w: Math.max(0.2, Number(e.target.value) || 0.2) } }))} />
          </label>
          <label className="field">
            <span>{pot ? 'Profondità del balcone/terrazzo (m)' : 'Lunghezza dell\'orto (m)'}</span>
            <input className="input" type="number" min="0.2" max="200" step="0.1" value={d.l}
              onChange={e => setDims(x => ({ ...x, [cultivation]: { ...d, l: Math.max(0.2, Number(e.target.value) || 0.2) } }))} />
          </label>
          <p className="small muted full" style={{ marginTop: -8 }}>Superficie: {(d.w * d.l).toLocaleString('it-IT', { maximumFractionDigits: 2 })} m². Potrai cambiare le misure e dividere lo spazio in lotti al passo 3.</p>

          {!pot && (
            <div className="full">
              <span className="lbl-strong">Tipo di terreno</span>
              <div className="soil-opts">
                {SOILS.map(s => (
                  <button type="button" key={s.value} className="soil-opt" aria-pressed={soil === s.value} onClick={() => setSoil(s.value)}>
                    <b>{s.label}</b><small>{s.hint}</small>
                  </button>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>Serve a calcolare quanta acqua trattiene il suolo e quindi ogni quanto annaffiare.</p>
            </div>
          )}

          <label className="field full">
            <span>Nome</span>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={place ? (pot ? `Balcone a ${place.name}` : `Orto a ${place.name}`) : 'Orto di casa'} />
          </label>
          <div className="full">
            <button className="btn" disabled={!place} onClick={goSuggestions}>Vedi cosa piantare</button>
            {!place && <span className="small muted" style={{ marginLeft: 12 }}>Scegli prima la città.</span>}
          </div>
        </div>
      )}

      {step === 2 && place && (
        <>
          {err && <div className="error">{err}</div>}
          {!sugg && !err && <Loading text={`Analizzo il clima di ${place.name} (2015–2024)…`} />}
          {sugg && (
            <>
              <section className="climate-band">
                <div>
                  <h2>Il clima di {place.name}</h2>
                  <p className="muted small" style={{ marginTop: 6 }}>{sugg.climate.source}{sugg.climate.period !== '—' && `, ${sugg.climate.period}`}</p>
                  <div className="climate-facts">
                    <div><b>{sugg.climate.annualMeanTemp} °C</b><span className="small muted">temperatura media annua</span></div>
                    <div><b>{Math.round(sugg.climate.annualPrecipitation)} mm</b><span className="small muted">pioggia annua</span></div>
                    <div><b>{sugg.climate.frostFreeDays} gg</b><span className="small muted">stagione senza gelo</span></div>
                    <div><b>{sugg.climate.lastSpringFrostDoy ? doyToDate(sugg.climate.lastSpringFrostDoy) : 'rare'}</b><span className="small muted">ultima gelata tipica</span></div>
                  </div>
                </div>
                <ClimateChart climate={sugg.climate} light />
              </section>
              {sugg.climate.estimated && <p className="notice" style={{ marginTop: 12 }}>Archivio climatico non raggiungibile: i suggerimenti usano una stima basata su latitudine e quota. Verranno ricalcolati con i dati reali appena il servizio torna disponibile.</p>}

              <div className="row" style={{ marginTop: 28 }}>
                <p className="muted" style={{ margin: 0, maxWidth: '62ch' }}>
                  Scegli cosa piantare {pot ? 'nei vasi' : 'nell\'orto'}. L'indicatore circolare misura quanto la specie è adatta al clima della città{pot ? ' e alla coltivazione in vaso' : ''}; la barra mostra i mesi migliori per piantarla.
                </p>
                <span className="spacer" />
                <SeasonLegend />
              </div>

              <RecGroup title="Da piantare adesso" sub="Temperature adatte e stagione sufficiente per arrivare al raccolto." items={now} picked={picked} onToggle={toggle} pot={pot} />
              {prot.length > 0 && <RecGroup title="Adesso, ma sotto protezione" sub="Servono tunnel o tessuto non tessuto per superare il freddo." items={prot} picked={picked} onToggle={toggle} pot={pot} />}
              {soon.length > 0 && <RecGroup title="Nelle prossime settimane" sub="Non ancora: potrai aggiungerle più avanti dalla mappa dell'orto." items={soon} picked={picked} onToggle={toggle} pot={pot} disabled />}
              {now.length === 0 && prot.length === 0 && <p className="notice" style={{ marginTop: 20 }}>In questo periodo il clima non permette nuove messe a dimora {pot ? 'in vaso all\'aperto' : 'in piena aria'}. Puoi creare comunque lo spazio e aggiungere le colture quando sarà il momento.</p>}

              <div className="stickybar">
                <div className="row">
                  <button className="btn ghost" onClick={() => setStep(1)}>Indietro</button>
                  <span className="spacer" />
                  <span className="muted small">{picked.length === 0 ? 'Nessuna pianta selezionata' : `${picked.length} ${picked.length === 1 ? 'specie' : 'specie'} selezionate`}</span>
                  <button className="btn sprout" onClick={goLayout}>{picked.length ? 'Disponi sulla mappa' : 'Continua senza piante'}</button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {step === 3 && layout && sugg && (
        <>
          <p className="muted" style={{ maxWidth: '66ch', marginBottom: 16 }}>
            Ecco una prima disposizione {pot ? 'dei vasi' : 'in lotti'}. Trascinali, ridimensionali o dividili: superficie, numero di piante e raccolto stimato si aggiornano mentre lavori.
          </p>
          {skipped.length > 0 && <p className="notice" style={{ marginBottom: 12 }}>Non c'era spazio per: {skipped.join(', ')}. Ingrandisci lo spazio o rimpicciolisci gli altri {pot ? 'vasi' : 'lotti'} e aggiungili.</p>}
          <LayoutEditor value={layout} onChange={setLayout} cultivation={cultivation} species={sugg.all} recommendedNow={recommendedNow} recommendations={sugg.recommendations} city={place?.name} />
          {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
          <CreateBar layout={layout} cultivation={cultivation} species={sugg.all} busy={busy} onBack={() => setStep(2)} onCreate={create} />
        </>
      )}
    </div>
  )
}

function CreateBar({ layout, cultivation, species, busy, onBack, onCreate }: {
  layout: LayoutValue; cultivation: Cultivation; species: SuggestionsResponse['all']; busy: boolean; onBack: () => void; onCreate: () => void
}) {
  const { problems } = useLotInfo(layout, cultivation, species)
  return (
    <div className="stickybar">
      <div className="row">
        <button className="btn ghost" onClick={onBack}>Indietro</button>
        <span className="spacer" />
        {problems.length > 0 && <span className="small" style={{ color: 'var(--danger)' }}>Correggi le sovrapposizioni per continuare</span>}
        <button className="btn sprout" disabled={busy || problems.length > 0} onClick={onCreate}>{busy ? 'Creo…' : cultivation === 'Vaso' ? 'Crea il balcone' : 'Crea l\'orto'}</button>
      </div>
    </div>
  )
}

function RecGroup({ title, sub, items, picked, onToggle, disabled, pot }: {
  title: string; sub: string; items: Recommendation[]; picked: string[]; onToggle: (id: string) => void; disabled?: boolean; pot: boolean
}) {
  if (items.length === 0) return null
  return (
    <section className="rec-group">
      <h3>{title}</h3>
      <p className="muted small">{sub}</p>
      <div className="rec-list">
        {items.map(r => {
          const sel = picked.includes(r.species.id)
          return (
            <div key={r.species.id} className={`rec${sel ? ' selected' : ''}`}>
              <span className="emoji" aria-hidden="true">{r.species.emoji}</span>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <h4>{r.species.name}</h4>
                  <em className="sci small">{r.species.scientificName}</em>
                  <span className={`chip${r.status === 'Ideale' ? ' ok' : ''}`}>{statusText[r.status]}</span>
                  {pot && <span className="chip">In vaso: {r.species.container.suitability.toLowerCase()}</span>}
                </div>
                <p className="small" style={{ margin: '4px 0 8px' }}>
                  {r.reason} {r.expectedHarvest && <>Raccolto stimato: <b>{fmtDate(r.expectedHarvest)}</b>. </>}
                  <span className="muted">
                    {pot ? `Almeno ${r.species.container.minLiters} L e ${r.species.container.minDepthCm} cm di profondità per pianta` : `${r.species.plantingMethod} · sesto ${r.species.spacingRowCm}×${r.species.spacingPlantCm} cm`}
                    {` · resa media ${r.species.yieldKgM2.toLocaleString('it-IT')} kg/m²`}
                  </span>
                </p>
                <div style={{ maxWidth: 280 }}><SeasonStrip calendar={r.calendar} labels /></div>
              </div>
              <div className="rec-side row" style={{ gap: 14, justifyContent: 'flex-end' }}>
                <FitnessDial score={r.fitness} label={r.fitnessLabel} size={56} />
                {!disabled && (
                  <button className={`btn small ${sel ? '' : 'ghost'}`} onClick={() => onToggle(r.species.id)} aria-pressed={sel}>
                    {sel ? 'Selezionata' : 'Aggiungi'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
