import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, doyToDate, fmtDate, fmtDateLong, fmtNum, fmtWeekday, SOILS, todayIso } from '../api'
import { useAuth } from '../auth'
import GardenMap, { type LotInfo } from '../components/GardenMap'
import { ClimateChart, FitnessDial, Loading, Modal, SeasonLegend, SeasonStrip, WaterChart, weatherIcon } from '../components/ui'
import type { CareType, Dashboard, EditLot, HistoryItem, PlantStatus, SpeciesSummary, TaskItem, WeatherDay } from '../types'
import { rememberGarden } from './Home'

export default function GardenPage() {
  const { id = '' } = useParams()
  const [d, setD] = useState<Dashboard>()
  const [err, setErr] = useState<string>()
  const { user } = useAuth()
  const [tab, setTab] = useState<'colture' | 'clima' | 'storico'>('colture')
  const [open, setOpen] = useState<string | null>(null)
  const [species, setSpecies] = useState<Map<string, SpeciesSummary>>(new Map())

  const load = useCallback(() => api.dashboard(id).then(setD).catch(e => setErr(e.message)), [id])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (user) rememberGarden(user.id, id) }, [user, id])
  useEffect(() => { api.plants().then(l => setSpecies(new Map(l.map(x => [x.species.id, x.species])))).catch(() => {}) }, [])

  const openCrop = (pid: string) => {
    setTab('colture'); setOpen(pid)
    setTimeout(() => document.getElementById(`crop-${pid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const act = async (p: PlantStatus, type: CareType, amount?: number, note?: string) => {
    await api.log(id, p.id, type, amount, undefined, note)
    await load()
  }
  const waterAll = async (tasks: TaskItem[]) => {
    const ids = [...new Set(tasks.filter(t => t.type === 'water').map(t => t.plantId))]
    if (ids.length) { await api.logMany(id, ids, 'Water'); await load() }
  }

  if (err) return <div className="wrap" style={{ paddingTop: 40 }}><div className="error">{err}</div></div>
  if (!d) return <Loading text="Calcolo bilancio idrico, gradi-giorno e previsioni…" />

  const g = d.garden
  const days = [...d.past.slice(-2), ...d.forecast]
  const today = todayIso()

  return (
    <>
      <header className="g-head">
        <div className="wrap">
          <div className="g-head-grid">
            <div>
              <h1>{g.name}</h1>
              <p className="muted" style={{ marginTop: 8 }}>
                {[g.city, g.region].filter(Boolean).join(', ')} · {g.cultivation === 'Vaso' ? 'in vaso' : `in terra, suolo ${SOILS.find(s => s.value === g.soil)?.label.toLowerCase()}`}
                {` · ${fmtNum(g.widthM, 2)} × ${fmtNum(g.lengthM, 2)} m`} · {fmtDateLong(today)}
              </p>
            </div>
            <div className="row">
              <Link className="btn sprout" to={`/orto/${id}/disposizione`}>Modifica disposizione</Link>
            </div>
          </div>
          <div className="weather" aria-label="Meteo: ultimi due giorni e previsione">
            {days.map(w => (
              <div key={w.date} className={`wday${w.date === today ? ' today' : ''}`}>
                <div className="d">{w.date === today ? 'Oggi' : fmtWeekday(w.date)} {Number(w.date.slice(8))}</div>
                <div className="ic" aria-hidden="true">{weatherIcon(w.weatherCode, w.precipitation)}</div>
                <div className="t">{Math.round(w.tMax)}° <span>{Math.round(w.tMin)}°</span></div>
                <div className="r">{w.precipitation >= 0.5 ? `${w.precipitation} mm` : ''}</div>
              </div>
            ))}
          </div>
          {!d.liveWeather && <p className="small muted" style={{ marginTop: 8 }}>Previsioni non raggiungibili: valori stimati dalle medie climatiche.</p>}
        </div>
      </header>

      <div className="wrap dash">
        <TaskBoard tasks={d.tasks} plants={d.plants} today={today} onAct={act} onWaterAll={waterAll} onOpen={openCrop} liveWeather={d.liveWeather} forecast={d.forecast} />

        <section>
          <Overview d={d} species={species} gardenId={id} onOpen={openCrop} />
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'colture'} onClick={() => setTab('colture')}>Colture ({d.plants.length})</button>
            <button role="tab" aria-selected={tab === 'storico'} onClick={() => setTab('storico')}>Registro</button>
            <button role="tab" aria-selected={tab === 'clima'} onClick={() => setTab('clima')}>Clima e stagioni</button>
          </div>

          {tab === 'colture' && (
            <>
              {d.plants.length === 0 && (
                <div className="empty">
                  <h3>Nessuna coltura in corso</h3>
                  <p className="muted">Apri la mappa, crea o seleziona un {g.cultivation === 'Vaso' ? 'vaso' : 'lotto'} e scegli cosa piantare: ti suggeriamo le specie adatte a questo periodo.</p>
                  <Link className="btn sprout" to={`/orto/${id}/disposizione`}>Apri la mappa</Link>
                </div>
              )}
              {d.plants.map(p => (
                <Bed key={p.id} p={p} lotName={g.lots.find(l => l.id === p.lotId)?.name} gardenId={id} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)}
                  onAct={act} onReload={load} onShowAll={() => setTab('storico')} />
              ))}
            </>
          )}

          {tab === 'clima' && <ClimateTab d={d} />}
          {tab === 'storico' && <History gardenId={id} onChanged={load} />}
        </section>
      </div>

    </>
  )
}

type ActFn = (p: PlantStatus, type: CareType, amount?: number, note?: string) => Promise<void>

const taskFilters: { key: 'all' | TaskItem['type']; label: string }[] = [
  { key: 'all', label: 'Tutte' }, { key: 'water', label: '💧 Annaffiare' }, { key: 'fertilize', label: '🧪 Concimare' },
  { key: 'harvest', label: '🧺 Raccogliere' }, { key: 'protect', label: '🛡️ Proteggere' },
]

const addDays = (iso: string, n: number) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const x = new Date(y, m - 1, dd + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** Raggruppa le attività per giorno (le scadute finiscono in "oggi"). */
function groupByDay(tasks: TaskItem[], today: string) {
  const map = new Map<string, TaskItem[]>()
  for (const t of tasks) {
    const k = t.date < today ? today : t.date
    map.set(k, [...(map.get(k) ?? []), t])
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function dayLabel(iso: string, today: string) {
  if (iso === today) return 'Oggi'
  if (iso === addDays(today, 1)) return 'Domani'
  const [y, m, dd] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, dd))
}

/** Riquadro "Da fare": oggi e i prossimi giorni, con il calendario completo in una finestra a parte. */
function TaskBoard({ tasks, plants, today, onAct, onWaterAll, onOpen, liveWeather, forecast }: {
  tasks: TaskItem[]; plants: PlantStatus[]; today: string; onAct: ActFn
  onWaterAll: (t: TaskItem[]) => Promise<void>; onOpen: (pid: string) => void; liveWeather: boolean; forecast: WeatherDay[]
}) {
  const [all, setAll] = useState(false)
  const groups = groupByDay(tasks, today)
  const limit = addDays(today, 6)
  // nel riquadro: oggi più i primi due giorni successivi con attività, entro una settimana
  const shown = [
    ...groups.filter(([k]) => k === today),
    ...groups.filter(([k]) => k > today && k <= limit).slice(0, 2),
  ]
  const todayTasks = groups.find(([k]) => k === today)?.[1] ?? []
  const counts = { water: 0, fertilize: 0, harvest: 0, protect: 0 } as Record<string, number>
  tasks.forEach(t => { counts[t.type] = (counts[t.type] ?? 0) + 1 })

  return (
    <aside className="tasks panel" aria-labelledby="todo-h">
      <h2 id="todo-h">Da fare</h2>
      <p className="small muted">Pianificato su previsioni meteo{liveWeather ? '' : ' (non disponibili: uso le medie climatiche)'}, clima e le operazioni che registri.</p>
      {todayTasks.length === 0 && <div className="alldone small">Oggi niente da fare. 🌱</div>}
      {shown.map(([day, list]) => (
        <DayGroup key={day} day={day} today={today} list={list} plants={plants} onAct={onAct} onOpen={onOpen}
          onWaterAll={day === today && list.filter(t => t.type === 'water').length > 1 ? () => onWaterAll(list) : undefined} />
      ))}
      {tasks.length > 0 && (
        <button className="btn ghost small seeall" onClick={() => setAll(true)}>
          Vedi tutto: calendario dei prossimi 30 giorni
        </button>
      )}
      {all && (
        <Modal onClose={() => setAll(false)} label="Tutte le attività">
          <AllTasks tasks={tasks} plants={plants} today={today} counts={counts} forecast={liveWeather ? forecast : []} onAct={onAct} onOpen={pid => { setAll(false); onOpen(pid) }} onClose={() => setAll(false)} />
        </Modal>
      )}
    </aside>
  )
}

function AllTasks({ tasks, plants, today, counts, forecast, onAct, onOpen, onClose }: {
  tasks: TaskItem[]; plants: PlantStatus[]; today: string; counts: Record<string, number>; forecast: WeatherDay[]
  onAct: ActFn; onOpen: (pid: string) => void; onClose: () => void
}) {
  const [f, setF] = useState<'all' | TaskItem['type']>('all')
  const [day, setDay] = useState<string | null>(null)
  const groups = groupByDay(tasks.filter(t => f === 'all' || t.type === f || (f === 'protect' && t.type === 'alert')), today)
    .filter(([k]) => !day || k === day)
  const last = tasks.length ? tasks[tasks.length - 1].date : today
  return (
    <div className="stack">
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <div style={{ flex: 1 }}>
          <h2>Tutte le attività</h2>
          <p className="small muted" style={{ marginTop: 6 }}>
            Da oggi al {fmtDate(last)}. Le date con «stima» sono calcolate sulle medie climatiche, oltre l'orizzonte delle previsioni:
            si aggiornano ogni giorno con il meteo reale e le operazioni che registri.
          </p>
        </div>
        <button className="linkbtn" onClick={onClose}>Chiudi</button>
      </div>
      <TaskCalendar tasks={tasks} forecast={forecast} today={today} selected={day} onSelect={setDay} />
      {day && (
        <div className="row small">
          <span>Attività di <b>{dayLabel(day, today).toLowerCase()}</b></span>
          <button className="linkbtn" onClick={() => setDay(null)}>Mostra tutti i giorni</button>
        </div>
      )}
      <div className="filters" role="group" aria-label="Tipo di attività" style={{ margin: 0 }}>
        {taskFilters.map(x => (
          <button key={x.key} aria-pressed={f === x.key} onClick={() => setF(x.key)}>
            {x.label}{x.key !== 'all' ? ` (${counts[x.key] ?? 0})` : ''}
          </button>
        ))}
      </div>
      {groups.length === 0 && <p className="muted">{day ? 'Nessuna attività in questo giorno: puoi stare tranquillo.' : 'Nessuna attività di questo tipo nei prossimi 30 giorni.'}</p>}
      <div className="alltasks">
        {groups.map(([day, list]) => <DayGroup key={day} day={day} today={today} list={list} plants={plants} onAct={onAct} onOpen={onOpen} />)}
      </div>
    </div>
  )
}

const isHail = (w?: WeatherDay) => w?.weatherCode === 96 || w?.weatherCode === 99
const isStorm = (w?: WeatherDay) => !!w && ((w.weatherCode ?? 0) >= 95 || w.precipitation >= 25)

/**
 * Calendario dei prossimi 30 giorni: blu = annaffiare, verde = concimare, rosso = raccogliere, nero = grandine prevista.
 * Evidenzia il periodo più lungo senza annaffiature, utile per programmare un'assenza.
 */
function TaskCalendar({ tasks, forecast, today, selected, onSelect }: {
  tasks: TaskItem[]; forecast: WeatherDay[]; today: string; selected: string | null; onSelect: (d: string | null) => void
}) {
  const days = Array.from({ length: 31 }, (_, i) => addDays(today, i))
  const byDay = new Map<string, TaskItem[]>()
  tasks.forEach(t => { const k = t.date < today ? today : t.date; byDay.set(k, [...(byDay.get(k) ?? []), t]) })
  const wx = new Map(forecast.map(w => [w.date, w]))
  const lastForecast = forecast.length ? forecast[forecast.length - 1].date : today
  const has = (d: string, type: string) => (byDay.get(d) ?? []).filter(t => t.type === type).length

  // periodo più lungo senza annaffiature (né protezioni urgenti)
  let best = { from: '', to: '', len: 0 }, cur = { from: '', len: 0 }
  for (const d of days) {
    if (has(d, 'water') || has(d, 'protect')) cur = { from: '', len: 0 }
    else { if (!cur.len) cur.from = d; cur.len++; if (cur.len > best.len) best = { from: cur.from, to: d, len: cur.len } }
  }

  // griglia allineata al lunedì
  const [y, m, dd] = today.split('-').map(Number)
  const lead = (new Date(y, m - 1, dd).getDay() + 6) % 7
  const cells: (string | null)[] = [...Array(lead).fill(null), ...days]
  const wd = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
  const fmtShort = (iso: string) => { const [yy, mm, d2] = iso.split('-').map(Number); return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(yy, mm - 1, d2)) }

  return (
    <div className="tcal">
      <div className="tcal-legend small">
        <span><i className="m water" />Annaffiare</span>
        <span><i className="m fertilize" />Concimare</span>
        <span><i className="m harvest" />Raccogliere</span>
        <span><i className="m hail" />Grandine</span>
        <span><i className="m storm" />Temporale forte</span>
      </div>
      <div className="tcal-grid" role="grid" aria-label="Calendario attività dei prossimi 30 giorni">
        {wd.map(w => <div key={w} className="tcal-wd">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={'e' + i} />
          const w = wx.get(d)
          const n = { water: has(d, 'water'), fertilize: has(d, 'fertilize'), harvest: has(d, 'harvest'), protect: has(d, 'protect') }
          const hail = isHail(w), storm = !hail && isStorm(w)
          const free = !n.water && !n.protect
          const inBest = best.len >= 3 && d >= best.from && d <= best.to
          const label = [
            dayLabel(d, today),
            n.water && `${n.water} annaffiature`, n.fertilize && `${n.fertilize} concimazioni`, n.harvest && `${n.harvest} raccolte`,
            hail && 'grandine prevista', storm && 'temporale forte', free && 'nessuna annaffiatura',
          ].filter(Boolean).join(', ')
          const dayNum = Number(d.slice(8))
          return (
            <button key={d} type="button" role="gridcell" aria-label={label} aria-pressed={selected === d} title={label}
              className={`tcal-day${d === today ? ' today' : ''}${d > lastForecast ? ' est' : ''}${inBest ? ' best' : ''}${hail ? ' hail' : ''}`}
              onClick={() => onSelect(selected === d ? null : d)}>
              <span className="num">{dayNum === 1 || d === today ? fmtShort(d) : dayNum}</span>
              <span className="marks">
                {n.water > 0 && <i className="m water" />}
                {n.fertilize > 0 && <i className="m fertilize" />}
                {n.harvest > 0 && <i className="m harvest" />}
                {storm && <i className="m storm" />}
              </span>
            </button>
          )
        })}
      </div>
      <p className="small tcal-note">
        {best.len >= 3
          ? <>🧳 Periodo più lungo senza annaffiature: <b>dal {fmtShort(best.from)} al {fmtShort(best.to)}</b> ({best.len} giorni, evidenziato).</>
          : <>Nei prossimi 30 giorni non ci sono pause di almeno 3 giorni senza annaffiare: per un'assenza serve qualcuno che bagni o un impianto a goccia.</>}
        {' '}Oltre il {fmtShort(lastForecast)} le date sono stime dalle medie climatiche (bordo tratteggiato), calcolate in modo prudente contando solo parte della pioggia media.
      </p>
    </div>
  )
}

function DayGroup({ day, today, list, plants, onAct, onOpen, onWaterAll }: {
  day: string; today: string; list: TaskItem[]; plants: PlantStatus[]; onAct: ActFn; onOpen: (pid: string) => void; onWaterAll?: () => void
}) {
  return (
    <section className={`daygroup${day === today ? ' is-today' : ''}`}>
      <div className="dayhead">
        <h3>{dayLabel(day, today)}</h3>
        <span className="small muted">{list.length} {list.length === 1 ? 'attività' : 'attività'}</span>
        {onWaterAll && <button className="btn water small" style={{ marginLeft: 'auto' }} onClick={onWaterAll}>Ho annaffiato tutto</button>}
      </div>
      {list.map((t, i) => <Task key={`${t.plantId}-${t.type}-${i}`} t={t} today={today} plants={plants} onAct={onAct} onOpen={() => onOpen(t.plantId)} />)}
    </section>
  )
}

function Task({ t, today, plants, onAct, onOpen }: { t: TaskItem; today: string; plants: PlantStatus[]; onAct: ActFn; onOpen: () => void }) {
  const p = plants.find(x => x.id === t.plantId)
  const [busy, setBusy] = useState(false)
  const run = async (type: CareType, amount?: number, note?: string) => { if (!p) return; setBusy(true); await onAct(p, type, amount, note); setBusy(false) }
  const isToday = t.date <= today
  return (
    <div className={`task ${t.type} ${isToday ? '' : 'later'}`}>
      <span className="bar" />
      <div>
        <b>{t.emoji} {t.title} · {t.plantName}</b>
        {t.estimated && <span className="est" title="Data calcolata sulle medie climatiche: verrà aggiornata con le previsioni">stima</span>}
        <div className="detail">{t.detail}</div>
        <div className="act row" style={{ gap: 8 }}>
          {isToday && p && t.type === 'water' && <button className="btn water small" disabled={busy} onClick={() => run('Water', p.water.litersTotal)}>Annaffiato</button>}
          {isToday && p && t.type === 'fertilize' && <button className="btn feed small" disabled={busy} onClick={() => run('Fertilize')}>Concimato</button>}
          {p && t.type === 'protect' && <button className="btn small" disabled={busy} onClick={() => run('Note', undefined, `Protezione: ${t.title}`)}>Fatto, coperta</button>}
          <button className="linkbtn" onClick={onOpen}>Dettagli</button>
        </div>
      </div>
    </div>
  )
}

const waterChip: Record<string, [string, string]> = {
  now: ['harvest', 'Annaffia oggi'], soon: ['water', 'Acqua a breve'], ok: ['ok', 'Suolo umido'],
  rain: ['water', 'Pioggia in arrivo'], dormant: ['', 'Riposo vegetativo'], planned: ['', 'Da piantare'],
}
const fertChip: Record<string, [string, string]> = {
  due: ['feed', 'Concima ora'], soon: ['feed', 'Concime a breve'], ok: ['', 'Concime ok'],
  none: ['', 'Niente concime'], stop: ['', 'Concime sospeso'], dormant: ['', 'Concime rimandato'],
}
const harvChip: Record<string, [string, string]> = {
  ready: ['harvest', 'Pronta'], late: ['harvest', 'Raccogli subito'], soon: ['harvest', 'Raccolto vicino'],
  growing: ['', ''], uncertain: ['', 'Raccolto incerto'], ended: ['', 'Fine ciclo'],
}

function Bed({ p, lotName, gardenId, open, onToggle, onAct, onReload, onShowAll }: {
  p: PlantStatus; lotName?: string; gardenId: string; open: boolean; onToggle: () => void
  onAct: (p: PlantStatus, type: CareType, amount?: number) => Promise<void>; onReload: () => void; onShowAll: () => void
}) {
  const [kg, setKg] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (type: CareType, amount?: number) => { setBusy(true); await onAct(p, type, amount); setBusy(false) }
  const [wc, wl] = waterChip[p.water.status]
  const [fc, fl] = fertChip[p.fertilize.status]
  const [hc, hl] = harvChip[p.harvest.status]
  const pct = Math.round(p.growth.progress * 100)

  const finish = async () => {
    if (!confirm(`Segnare ${p.label ?? p.name} come coltura conclusa? Sparirà dalla dashboard.`)) return
    await api.updatePlant(gardenId, p.id, { active: false }); onReload()
  }
  const remove = async () => {
    if (!confirm(`Eliminare ${p.label ?? p.name} e tutto il suo storico?`)) return
    await api.deletePlant(gardenId, p.id); onReload()
  }

  return (
    <article className="bed" id={`crop-${p.id}`}>
      <button className="bed-main" onClick={onToggle} aria-expanded={open}>
        <span className="emoji" aria-hidden="true">{p.emoji}</span>
        <div>
          <div className="bed-title">
            <h3>{p.label ?? p.name}</h3>
            <span className="muted small">{lotName && lotName !== (p.label ?? p.name) ? `${lotName} · ` : ''}{p.quantity} {p.quantity === 1 ? 'pianta' : 'piante'} · {fmtNum(p.areaM2, 2)} m² · dal {fmtDate(p.plantedOn)}</span>
          </div>
          <div className="small" style={{ marginTop: 2 }}>{p.growth.stage}{p.harvest.status === 'growing' && p.harvest.expectedStart && <span className="muted"> · raccolto verso il {fmtDate(p.harvest.expectedStart)}</span>}</div>
          <div className="track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avanzamento verso il raccolto">
            <span className="fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="bed-status">
            <span className={`chip ${wc}`}>💧 {wl}</span>
            <span className={`chip ${fc}`}>{fl}</span>
            {hl && <span className={`chip ${hc}`}>{hl}</span>}
            {p.alerts.map((a, i) => <span key={i} className={`chip ${a.level === 'danger' ? 'harvest' : a.level === 'warning' ? 'feed' : 'water'}`}>⚠ {a.title}</span>)}
          </div>
        </div>
        <FitnessDial score={p.fitness} label={p.fitnessLabel} size={54} note={p.fitnessNote} />
      </button>

      {open && (
        <div className="bed-body">
          {p.alerts.length > 0 && (
            <div className="alerts">{p.alerts.map((a, i) => <div key={i} className={`alert ${a.level}`}><b>{a.title}.</b> {a.message}</div>)}</div>
          )}

          <div className="care water">
            <h4><span className="dot" />Irrigazione</h4>
            <p>{p.water.message}</p>
            <WaterChart points={p.water.history} />
            <div className="small muted">Acqua mancante nella zona radicale (barre) e soglia d'intervento (tratteggio); le barre chiare sono la previsione.</div>
            <dl className="kv">
              <dt>Manca ora</dt><dd>{p.water.depletionMm} mm su {p.water.totalAvailableMm} mm</dd>
              <dt>Consumo oggi</dt><dd>{p.water.etcToday} mm (Kc {p.water.kc})</dd>
              <dt>Pioggia 3 gg</dt><dd>{p.water.rainNext3Days} mm</dd>
              <dt>Dose</dt><dd>{p.water.litersPerPlant} L/pianta · {p.water.litersTotal} L tot.</dd>
              <dt>Ultima volta</dt><dd>{p.lastWatered ? fmtDate(p.lastWatered) : 'mai registrata'}</dd>
            </dl>
            <button className="btn water small" disabled={busy} onClick={() => run('Water', p.water.litersTotal)}>Annaffiato ({p.water.litersTotal} L)</button>
          </div>

          <div className="care feed">
            <h4><span className="dot" />Concimazione</h4>
            <p>{p.fertilize.message}</p>
            <dl className="kv">
              <dt>Fase</dt><dd>{p.fertilize.phase}</dd>
              {p.fertilize.nextDate && <><dt>Prossima</dt><dd>{fmtDate(p.fertilize.nextDate)}</dd></>}
              <dt>Ultima</dt><dd>{p.lastFertilized ? fmtDate(p.lastFertilized) : '—'}</dd>
            </dl>
            <p className="small"><b>Cosa usare:</b> {p.fertilize.advice}</p>
            <p className="small muted"><b>Biologico:</b> {p.fertilize.organic}</p>
            {p.fertilize.status !== 'none' && <button className="btn feed small" disabled={busy} onClick={() => run('Fertilize')}>Concimato</button>}
          </div>

          <div className="care harvest">
            <h4><span className="dot" />Raccolta</h4>
            <p>{p.harvest.message}</p>
            <dl className="kv">
              <dt>Avanzamento</dt><dd>{pct}% · {p.growth.gddAccumulated}/{p.growth.gddRequired} gradi-giorno</dd>
              {p.harvest.expectedStart && <><dt>Finestra</dt><dd>{fmtDate(p.harvest.expectedStart)} – {fmtDate(p.harvest.expectedEnd)}</dd></>}
              <dt>Stima</dt><dd>~{fmtNum(p.expectedYieldKg)} kg per ciclo</dd>
              <dt>Raccolto</dt><dd>{fmtNum(p.harvestedKg)} kg{p.expectedYieldKg > 0 && p.harvestedKg > 0 ? ` (${Math.round((p.harvestedKg / p.expectedYieldKg) * 100)}% della stima)` : ''}</dd>
            </dl>
            <p className="small"><b>Quando è pronta:</b> {p.harvest.signs}</p>
            <div className="row" style={{ gap: 8 }}>
              <input className="input" style={{ width: 90, padding: '6px 10px' }} type="number" min="0" step="0.1" placeholder="kg" value={kg} onChange={e => setKg(e.target.value)} aria-label="Chili raccolti" />
              <button className="btn harvest small" disabled={busy} onClick={async () => { await run('Harvest', kg ? Number(kg) : undefined); setKg('') }}>Registra raccolto</button>
            </div>
          </div>

          <div className="bed-foot">
            <div className="logs">
              <b>Ultime operazioni</b>
              {p.logCount > p.recentLogs.length && <span> · {p.recentLogs.length} di {p.logCount} <button className="linkbtn" onClick={onShowAll}>vedi tutte nel Registro</button></span>}
              {p.recentLogs.length === 0 ? <div>Nessuna operazione registrata.</div> : (
                <ul>
                  {p.recentLogs.map(l => (
                    <li key={l.id}>
                      {fmtDate(l.date)} — {{ Water: 'irrigazione', Fertilize: 'concimazione', Harvest: 'raccolto', Note: 'nota' }[l.type]}
                      {l.amount != null && ` (${l.amount} ${l.type === 'Water' ? 'L' : l.type === 'Harvest' ? 'kg' : 'g'})`}
                      <button className="linkbtn" onClick={async () => { await api.deleteLog(gardenId, p.id, l.id); onReload() }} aria-label="Elimina voce">annulla</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <span className="spacer" />
            <Link to={`/orto/${gardenId}/piante/${p.speciesId}`} className="btn ghost small">Scheda della specie</Link>
            <button className="linkbtn" onClick={finish}>Concludi coltura</button>
            <button className="linkbtn danger" onClick={remove}>Elimina</button>
          </div>
        </div>
      )}
    </article>
  )
}

function ClimateTab({ d }: { d: Dashboard }) {
  const c = d.climate
  const month = new Date().getMonth()
  const m = c.months[month]
  return (
    <div className="stack">
      <div className="panel">
        <div className="row"><h3>Normali climatiche</h3><span className="spacer" /><span className="small muted">{c.source}{c.period !== '—' && `, ${c.period}`}</span></div>
        <ClimateChart climate={c} />
        <div className="row small muted">
          <span>Media annua <b>{c.annualMeanTemp} °C</b></span>
          <span>Pioggia <b>{Math.round(c.annualPrecipitation)} mm</b></span>
          <span>Stagione senza gelo <b>{c.frostFreeDays} giorni</b></span>
          <span>Ultima gelata tipica <b>{doyToDate(c.lastSpringFrostDoy)}</b></span>
          <span>Prima gelata tipica <b>{doyToDate(c.firstAutumnFrostDoy)}</b></span>
        </div>
        <p className="small" style={{ marginTop: 10 }}>
          Questo mese in media: massime {m.tMax} °C, minime {m.tMin} °C, {m.precipitation} mm di pioggia, evapotraspirazione {m.et0} mm
          {m.frostDays > 0.5 && `, ${m.frostDays} giorni di gelo`}.
        </p>
      </div>
      <div className="panel">
        <div className="row"><h3>Calendario di semina per {d.garden.city}</h3><span className="spacer" /><SeasonLegend /></div>
        <p className="small muted">Le specie adatte a questo periodo e quelle in arrivo nelle prossime settimane.</p>
        <div className="stack" style={{ marginTop: 14 }}>
          {d.recommendations.map(r => (
            <div key={r.species.id} className="row" style={{ gap: 14 }}>
              <span style={{ width: 160 }}>{r.species.emoji} {r.species.name}</span>
              <div style={{ flex: 1, minWidth: 200 }}><SeasonStrip calendar={r.calendar} /></div>
              <FitnessDial score={r.fitness} size={36} note={r.fitnessNote} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Vista dall'alto in sola lettura con lo stato di ogni lotto e i totali di resa. */
function Overview({ d, species, gardenId, onOpen }: { d: Dashboard; species: Map<string, SpeciesSummary>; gardenId: string; onOpen: (plantId: string) => void }) {
  const g = d.garden
  const [sel, setSel] = useState<string | null>(null)
  const lots: EditLot[] = useMemo(() => g.lots.map(l => ({ key: l.id, id: l.id, name: l.name, x: l.x, y: l.y, w: l.w, h: l.h, depthCm: l.depthCm })), [g.lots])
  const info = useMemo(() => {
    const r: Record<string, LotInfo> = {}
    for (const l of g.lots) {
      const crop = d.plants.find(p => p.lotId === l.id)
      const badges: string[] = []
      if (crop) {
        if (crop.alerts.some(a => a.level === 'danger')) badges.push('⚠️')
        if (crop.water.status === 'now') badges.push('💧')
        if (crop.fertilize.status === 'due') badges.push('🧪')
        if (crop.harvest.status === 'ready' || crop.harvest.status === 'late') badges.push('🧺')
      }
      r[l.id] = { species: crop ? species.get(crop.speciesId) : undefined, plants: crop?.quantity, kg: crop?.expectedYieldKg, progress: crop?.growth.progress, badges }
    }
    return r
  }, [g.lots, d.plants, species])
  const used = g.lots.reduce((a, l) => a + l.w * l.h, 0)
  const pot = g.cultivation === 'Vaso'

  const legend = `💧 da annaffiare · 🧪 da concimare · 🧺 da raccogliere · ⚠️ allerta meteo.`
  const tapHint = `Tocca un ${pot ? 'vaso' : 'lotto'} sulla mappa per i dettagli.`

  return (
    <div className="overview-row">
      {/* Card 1: dimensioni e legenda */}
      <div className="panel overview-info">
        
        <div className="ov-stats small">
          <span><b>{fmtNum(used, 2)}</b> / {fmtNum(g.widthM * g.lengthM, 2)} m² coltivati</span>
          <span><b>~{fmtNum(d.expectedYieldKg)} kg</b> stimati</span>
          <span><b>{fmtNum(d.harvestedKg)} kg</b> raccolti</span>
        </div>
        {g.lots.length > 0 && <p className="small muted">{legend}<br />{tapHint}</p>}
      </div>

      {/* Card 2: solo la mappa */}
      <div className="panel overview-map" aria-label={`Mappa ${pot ? 'dei vasi' : 'dell\'orto'} vista dall'alto`}>
        {g.lots.length === 0 ? (
          <div className="empty">
            <p className="muted">Non hai ancora diviso lo spazio in {pot ? 'vasi' : 'lotti'}.</p>
            <Link className="btn sprout" to={`/orto/${gardenId}/disposizione`}>Disegna {pot ? 'i vasi' : 'i lotti'}</Link>
          </div>
        ) : (
          <GardenMap widthM={g.widthM} lengthM={g.lengthM} cultivation={g.cultivation} lots={lots} info={info}
            maxHeight={Math.max(320, Math.min(window.innerHeight * 0.6, 560))}
            selected={sel} onSelect={k => {
              setSel(k)
              const crop = k ? d.plants.find(p => p.lotId === k) : undefined
              if (crop) onOpen(crop.id)
            }} />
        )}
      </div>
    </div>
  )
}

const logName: Record<CareType, string> = { Water: 'Irrigazione', Fertilize: 'Concimazione', Harvest: 'Raccolto', Note: 'Nota' }
const logUnit: Record<CareType, string> = { Water: 'L', Fertilize: 'g', Harvest: 'kg', Note: '' }

function History({ gardenId, onChanged }: { gardenId: string; onChanged: () => void }) {
  const [items, setItems] = useState<HistoryItem[]>()
  const [type, setType] = useState<CareType | 'all'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string>()
  const reload = useCallback(() => api.history(gardenId).then(setItems), [gardenId])
  useEffect(() => { reload() }, [reload])

  const remove = async (i: HistoryItem) => {
    const what = `${logName[i.type].toLowerCase()} del ${fmtDate(i.date)} su ${i.plantName}${i.amount != null ? ` (${fmtNum(i.amount)} ${logUnit[i.type]})` : ''}`
    if (!confirm(`Eliminare ${what}? I consigli di irrigazione e concimazione verranno ricalcolati.`)) return
    setBusy(i.id); setErr(undefined)
    try { await api.deleteLog(gardenId, i.plantId, i.id); await reload(); onChanged() }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy(null) }
  }
  if (!items) return <Loading />
  const shown = items.filter(i => type === 'all' || i.type === type)
  const kg = items.filter(i => i.type === 'Harvest').reduce((a, i) => a + (i.amount ?? 0), 0)
  const liters = items.filter(i => i.type === 'Water').reduce((a, i) => a + (i.amount ?? 0), 0)
  return (
    <div className="panel">
      <div className="row">
        <div className="filters" role="group" aria-label="Tipo di operazione" style={{ margin: 0 }}>
          {(['all', 'Water', 'Fertilize', 'Harvest'] as const).map(t => (
            <button key={t} aria-pressed={type === t} onClick={() => setType(t)}>{t === 'all' ? 'Tutte' : logName[t]}</button>
          ))}
        </div>
        <span className="spacer" />
        {err && <div className="error" role="alert" style={{ width: '100%' }}>{err}</div>}
        <span className="small muted">{items.length} operazioni · {fmtNum(liters, 0)} L d'acqua · {fmtNum(kg)} kg raccolti</span>
      </div>
      {shown.length === 0 ? <p className="muted" style={{ marginTop: 16 }}>Nessuna operazione registrata. Usa i pulsanti "Annaffiato", "Concimato" e "Registra raccolto" sulle colture.</p> : (
        <div className="table-wrap"><table className="table" style={{ marginTop: 12 }}>
          <thead><tr><th>Data</th><th>Operazione</th><th>Coltura</th><th>Quantità</th><th><span className="sr-only">Azioni</span></th></tr></thead>
          <tbody>
            {shown.map(i => (
              <tr key={i.id}>
                <td>{fmtDate(i.date)}</td>
                <td>{logName[i.type]}</td>
                <td>{i.emoji} {i.plantName}{!i.active && <span className="small muted"> (conclusa)</span>}</td>
                <td>{i.amount != null ? `${fmtNum(i.amount)} ${logUnit[i.type]}` : '—'}</td>
                <td className="actions">
                  <button className="linkbtn danger" disabled={busy === i.id} onClick={() => remove(i)}
                    aria-label={`Elimina ${logName[i.type].toLowerCase()} del ${fmtDate(i.date)} su ${i.plantName}`}>
                    {busy === i.id ? 'Elimino…' : 'Elimina'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  )
}
